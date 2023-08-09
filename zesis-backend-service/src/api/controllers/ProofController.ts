import { Request, Response } from "express";
import axios from "axios";

import {
  KYCQueryMTPInput,
  KYCNonRevQueryMTPInput,
  KYCQuerySigInput,
  KYCNonRevQuerySigInput,
  query as zidenjsQuery,
  schema as zidenjsSchema,
  utils as zidenjsUtils,
} from "@zidendev/zidenjs";
import { IQuery } from "../models/Service.js";
import { ProofService } from "../services/ProofService.js";
import { ServiceService } from "../services/ServiceService.js";
import { BadRequestError } from "../errors/http/BadRequestError.js";
import { NotFoundError } from "../errors/http/NotFoundError.js";
import { sendRes } from "../responses/index.js";
import logger from "../../lib/logger/index.js";
import utils from "../utils/index.js";
import { SchemaService } from "../services/SchemaService.js";
export interface ProofRequest {
  verifierId: string;
  message: string;
  requirements: {
    schemaHash: string;
    circuitId: string;
    query: IQuery;
  }[];
}

export interface ProofData {
  mtpInput?: KYCQueryMTPInput;
  nonRevMtpInput?: KYCNonRevQueryMTPInput;
  sigInput?: KYCQuerySigInput;
  nonRevSigInput?: KYCNonRevQuerySigInput;
}

export interface Proof {
  proof: any;
  publicData: any;
}

export class ProofController {
  serviceService: ServiceService;
  proofService: ProofService;
  schemaService: SchemaService;

  constructor() {
    this.serviceService = new ServiceService();
    this.proofService = new ProofService();
    this.schemaService = new SchemaService();

    this.generateProofRequest = this.generateProofRequest.bind(this);
    this.fetchProofRequest = this.fetchProofRequest.bind(this);
    this.submitProofs = this.submitProofs.bind(this);
    this.verifyProofs = this.verifyProofs.bind(this);
  }

  public async generateProofRequest(req: Request, res: Response) {
    try {
      if (!req.body.serviceId)
        throw new BadRequestError("Missing serviceId in request body");
      const request = {
        serviceId: req.body.serviceId,
        message: "Sign this message to provide proof",
      };
      const newRequest = await this.proofService.generateProofRequest(request);
      sendRes(res, null, {
        request: {
          requestId: newRequest._id,
          serviceId: newRequest.serviceId,
          message: newRequest.message,
          validUntil: newRequest.validUntil ?? "",
        },
      });
    } catch (error: any) {
      logger.error(error);
      sendRes(res, error);
    }
  }

  public async fetchProofRequest(req: Request, res: Response) {
    try {
      if (!req.params.requestId)
        throw new BadRequestError("Missing requestId in request params");
      const request = await this.proofService.findProofRequest(
        req.params.requestId
      );
      if (request === undefined)
        throw new NotFoundError("Request does not existed");
      sendRes(res, null, {
        request: {
          requestId: request._id,
          serviceId: request.serviceId,
          message: request.message,
          validUntil: request.validUntil ?? "",
          zkProofs: request.proofs || [],
        },
      });
    } catch (error: any) {
      logger.error(error);
      sendRes(res, error);
    }
  }

  public async submitProofs(req: Request, res: Response) {
    try {
      if (!req.body.requestId)
        throw new BadRequestError("Missing requestId in request param");
      if (!req.body.zkProofs)
        throw new BadRequestError("Missing zkProofs in request param");

      const request = await this.proofService.findProofRequest(
        req.body.requestId
      );
      if (request === undefined)
        throw new BadRequestError("Request does not exist");
      const service = await this.serviceService.findOneById(request.serviceId);
      if (service === undefined)
        throw new BadRequestError("Service does not exist");

      // check requirement

      const zkProofs = req.body.zkProofs;
      const requirements = service.requirements;

      for (let i = 0; i < requirements.length; i++) {
        const requirement = requirements[i];
        let zkProof = zkProofs[i];
        const schemaHash = BigInt(zkProof.publicData[7]).toString(10);
        const issuerId = BigInt(zkProof.publicData[4]).toString(16);
        const deterministicValue = zkProof.publicData[10];
        const operator = zkProof.publicData[9];

        if (schemaHash != requirement.schemaHash) {
          throw new BadRequestError(
            `expect the schema hash to be ${requirement.schemaHash}, be received ${schemaHash}`
          );
        }

        if (!requirement.allowedIssuers.includes(issuerId)) {
          throw new BadRequestError(`the issuerID ${issuerId} is not allowed`);
        }

        if (operator != requirement.query.operator.toString()) {
          throw new BadRequestError(
            `expected the operator to be ${requirement.query.operator.toString()} but received ${operator}`
          );
        }

        const schema = await this.schemaService.findOneById(schemaHash);
        if (!schema) {
          throw new BadRequestError(
            `the schema hash ${schemaHash} doesn't match with any existing schemas`
          );
        }
        const jsonSchema = await utils.fetchSchemaContext(
          (
            await axios.get(schema.accessUri)
          ).data
        );
        const schemaPropertiesSlot =
          zidenjsSchema.schemaPropertiesSlot(jsonSchema);
        if (schemaPropertiesSlot[requirement.query.propertyName] == undefined) {
          throw new BadRequestError(
            `the ${requirement.query.propertyName} property not found`
          );
        }
        const slotIndex =
          schemaPropertiesSlot[requirement.query.propertyName].slot;
        if (slotIndex.toString() != zkProof.publicData[8]) {
          throw new BadRequestError(
            `expect the slot index to be ${slotIndex.toString()} but got ${
              zkProofs[i].publicData[8]
            }`
          );
        }
        const begin =
          schemaPropertiesSlot[requirement.query.propertyName].begin;
        const end = schemaPropertiesSlot[requirement.query.propertyName].end;
        const mask = zidenjsUtils.createMask(begin, end);
        if (mask.toString() != zkProof.publicData[11]) {
          throw new BadRequestError(
            `expect the mask value to be ${mask.toString()} but got ${
              zkProofs[i].publicData[11]
            }`
          );
        }

        const expectedDeterministicValue = zidenjsQuery
          .calculateDeterministicValue(
            utils.parseBigInt(requirement.query.value),
            6,
            Number(requirement.query.operator),
            begin
          )
          .toString(10);

        if (expectedDeterministicValue != deterministicValue) {
          throw new BadRequestError(
            `expected the deterministic value to be ${expectedDeterministicValue} but received ${deterministicValue}`
          );
        }
      }

      if (service.contractAddress) {
        let tx = await this.proofService.callMultiservice(
          Number(service.networkId),
          req.body.zkProofs,
          service.contractAddress
        );
        console.log(tx);
        sendRes(res, null, { isValid: true, tx });
      } else {
        const verifications = await Promise.all(
          req.body.zkProofs.map((proof: Proof) => {
            return this.proofService.verifyZkProof(
              Number(service.networkId),
              proof
            );
          })
        );

        await this.proofService.saveProof(
          req.body.requestId,
          req.body.zkProofs
        );

        sendRes(res, null, {
          isValid: !verifications.includes(false),
          results: verifications,
        });
      }
    } catch (error: any) {
      logger.error(error);
      sendRes(res, error);
    }
  }

  public async verifyProofs(req: Request, res: Response) {
    try {
      if (!req.body.networkId)
        throw new BadRequestError("Missing networkId in request param");
      if (!req.body.zkProofs)
        throw new BadRequestError("Missing zkProofs in request body");
      const verifications = await Promise.all(
        req.body.zkProofs.map((proof: Proof) => {
          return this.proofService.verifyZkProof(
            Number(req.body.networkId),
            proof
          );
        })
      );

      sendRes(res, null, {
        isValid: !verifications.includes(false),
        results: verifications,
      });
    } catch (error: any) {
      logger.error(error);
      sendRes(res, error);
    }
  }
}
