import { NextFunction, Request, Response } from "express";
import axios from "axios";

import { ServiceService } from "../services/ServiceService.js";
import { SchemaService } from "../services/SchemaService.js";
import Service, { IService } from "../models/Service.js";
import { sendRes } from "../responses/index.js";
import { BadRequestError } from "../errors/http/BadRequestError.js";
import { NotFoundError } from "../errors/http/NotFoundError.js";
import { DefaultEndpoint } from "../../lib/constants/index.js";
import utils from "../utils/index.js";
import env from "../../lib/env/index.js";
import {
  query as zidenjsQuery,
  schema as zidenjsSchema,
  utils as zidenjsUtils,
} from "@zidendev/zidenjs";
import {
  createMultiService,
  updateMultiService,
} from "../../lib/networks/evm/index.js";

export class ServiceController {
  serviceService: ServiceService;
  schemaService: SchemaService;

  constructor() {
    this.serviceService = new ServiceService();
    this.schemaService = new SchemaService();

    this.registerService = this.registerService.bind(this);
    this.findServiceById = this.findServiceById.bind(this);
    this.findServices = this.findServices.bind(this);
    this.fetchProofRequest = this.fetchProofRequest.bind(this);
    this.updateService = this.updateService.bind(this);
    this.toggleServiceActive = this.toggleServiceActive.bind(this);
    this.syncWeb3Services = this.syncWeb3Services.bind(this);
  }

  public async findServiceById(req: Request, res: Response) {
    try {
      if (!req.params.serviceId)
        throw new BadRequestError("Missing serviceId in request param");

      const service = await this.serviceService.findOneById(
        req.params.serviceId
      );
      if (service === undefined)
        throw new NotFoundError("Service does not exist");

      sendRes(res, null, {
        service: {
          serviceId: service._id,
          name: service.name,
          description: service.description,
          endpointUrl: service.endpointUrl,
          contractAddress: service.contractAddress,
          verifier: {
            verifierId: "",
            name: "Unknown Verifier",
            logoUrl: utils.getLogoUrl(""),
            contact: "",
            website: "",
          },
          network: {
            networkId: 97, // FIXME: TBD after finishing network routes
            name: "BNB Chain Testnet", // FIXME: TBD after finishing network routes
          },
          requirements: await Promise.all(
            service.requirements.map(async (req) => {
              const [issuers, schema] = await Promise.all([
                req.allowedIssuers,
                this.schemaService.findOneById(req.schemaHash),
              ]);
              Object.assign(req, {
                allowedIssuers: issuers.map((issuer) => {
                  return {
                    issuerId: issuer,
                    name: "Unknown Issuer",
                    endpointUrl: "",
                  };
                }),
                schema: {
                  name: schema?.name ?? "Unknown Schema",
                  schemaHash: schema?.hash ?? "",
                },
              });
              return req;
            })
          ),
          active: service.active,
        },
      });
    } catch (error: any) {
      sendRes(res, error);
    }
  }

  public async registerService(req: Request, res: Response) {
    try {
      if (!req.body.networkId || !req.body.requirements)
        throw new BadRequestError("Missing service property in request body");
      let service: IService = {
        name: req.body.name ?? "Unnamed Service",
        description:
          req.body.description ?? "This service does not have any description",
        networkId: req.body.networkId,
        requirements: req.body.requirements,
        endpointUrl:
          req.body.endpointUrl ??
          utils.getDefaultUrl(
            DefaultEndpoint.Service,
            env.app.hostname,
            req.body.verifierId
          ),
        active: true,
      };
      if (req.body.isContract) {
        let queries = [];
        for (let i = 0; i < service.requirements.length; i++) {
          const requirement = service.requirements[i];

          const schema = await this.schemaService.findOneById(
            requirement.schemaHash
          );
          if (!schema) {
            continue;
          }
          const jsonSchema = await utils.fetchSchemaContext(
            (
              await axios.get(schema.accessUri)
            ).data
          );
          const schemaPropertiesSlot =
            zidenjsSchema.schemaPropertiesSlot(jsonSchema);
          if (
            schemaPropertiesSlot[requirement.query.propertyName] == undefined
          ) {
            continue;
          }
          const slotIndex =
            schemaPropertiesSlot[requirement.query.propertyName].slot;

          const begin =
            schemaPropertiesSlot[requirement.query.propertyName].begin;
          const end = schemaPropertiesSlot[requirement.query.propertyName].end;
          const mask = zidenjsUtils.createMask(begin, end).toString(10);

          const deterministicValue = zidenjsQuery
            .calculateDeterministicValue(
              requirement.query.value.map((v) => BigInt(v)),
              6,
              Number(requirement.query.operator),
              begin
            )
            .toString(10);

          queries.push({
            deterministicValue,
            mask,
            claimSchema: requirement.schemaHash,
            timestamp: 0,
            slotIndex,
            operator: requirement.query.operator,
          });
        }

        const contract = await createMultiService(
          parseInt(service.networkId),
          queries
        );

        service.contractAddress = contract?.address;
      }

      const newService = await this.serviceService.createService(service);
      if (!newService) throw new BadRequestError("Service existed");
      sendRes(res, null, { service: newService });
    } catch (error: any) {
      sendRes(res, error);
    }
  }

  public async syncWeb3Services(req: Request, res: Response) {
    try {
      console.log("syncing");
      if (!req.body.networkId)
        throw new BadRequestError("Missing networkId property in request body");

      const services = await this.serviceService.findAll({});
      const web3Services = services.filter(
        (service) => service.contractAddress !== undefined
      );
      console.log(web3Services);
      console.log("------------------------");

      for (let i = 0; i < web3Services.length; i++) {
        let queries = [];
        let service = web3Services[i];
        for (let i = 0; i < service.requirements.length; i++) {
          const requirement = service.requirements[i];

          const schema = await this.schemaService.findOneById(
            requirement.schemaHash
          );
          if (!schema) {
            throw new Error("Schema not found");
          }
          const jsonSchema = await utils.fetchSchemaContext(
            (
              await axios.get(schema.accessUri)
            ).data
          );
          const schemaPropertiesSlot =
            zidenjsSchema.schemaPropertiesSlot(jsonSchema);
          if (
            schemaPropertiesSlot[requirement.query.propertyName] == undefined
          ) {
            throw new Error("Property not found");
          }
          const slotIndex =
            schemaPropertiesSlot[requirement.query.propertyName].slot;

          const begin =
            schemaPropertiesSlot[requirement.query.propertyName].begin;
          const end = schemaPropertiesSlot[requirement.query.propertyName].end;
          const mask = zidenjsUtils.createMask(begin, end).toString(10);

          const deterministicValue = zidenjsQuery
            .calculateDeterministicValue(
              requirement.query.value.map((v) => BigInt(v)),
              6,
              Number(requirement.query.operator),
              begin
            )
            .toString(10);

          queries.push({
            deterministicValue,
            mask,
            claimSchema: requirement.schemaHash,
            timestamp: 0,
            slotIndex,
            operator: requirement.query.operator,
          });
        }

        const tx = await updateMultiService(
          parseInt(service.networkId),
          service.contractAddress!,
          queries
        );
        console.log(tx);
      }
      sendRes(res, null, { success: true });
    } catch (err) {
      console.error(err);
      sendRes(res, err as Error);
    }
  }

  public async findServices(req: Request, res: Response) {
    try {
      let query: any = {};

      if (req.query.active != undefined) {
        query["active"] = req.query.active;
      }

      if (req.query.verifierId != undefined) {
        console.log(req.query.verifierId);
        query["verifierId"] = req.query.verifierId;
      }

      if (req.query.networkId != undefined) {
        // query["networdId"] = req.query.networdId;
      }

      let services = await this.serviceService.findAll(query);

      sendRes(res, null, {
        services: await Promise.all(
          services.map(async (service) => {
            return {
              serviceId: service._id,
              name: service.name,
              description: service.description,
              endpointUrl: service.endpointUrl,
              contractAddress: service.contractAddress,
              verifier: {
                verifierId: "",
                name: "Unknown Verifier",
                logoUrl: utils.getLogoUrl(""),
                contact: "",
                website: "",
              },
              network: {
                networkId: 97, // FIXME: TBD after finishing network routes
                name: "BNB Chain Testnet", // FIXME: TBD after finishing network routes
              },
              requirements: await Promise.all(
                service.requirements.map(async (req) => {
                  const [issuers, schema] = await Promise.all([
                    req.allowedIssuers,
                    this.schemaService.findOneById(req.schemaHash),
                  ]);
                  Object.assign(req, {
                    allowedIssuers: issuers.map((issuer) => {
                      return {
                        issuerId: issuer,
                        name: "Unknown Issuer",
                        endpointUrl: "",
                      };
                    }),
                    schema: {
                      name: schema?.name ?? "Unknown Schema",
                      schemaHash: schema?.hash ?? "",
                    },
                  });
                  return req;
                })
              ),
              active: service.active,
            };
          })
        ),
      });
    } catch (error: any) {
      sendRes(res, error);
    }
  }

  public async fetchProofRequest(req: Request, res: Response) {
    try {
      if (!req.body.service)
        throw new BadRequestError("Missing service property in request body");
      sendRes(res, null, {});
    } catch (error: any) {
      sendRes(res, error);
    }
  }

  public async updateService(req: Request, res: Response) {
    try {
      if (!req.body.service)
        throw new BadRequestError("Missing service property in request body");
      sendRes(res, null, {});
    } catch (error: any) {
      sendRes(res, error);
    }
  }

  public async toggleServiceActive(req: Request, res: Response) {
    try {
      const serviceId = req.params.serviceId;
      if (!serviceId || typeof serviceId != "string") {
        throw new BadRequestError("Invalid serviceId");
      }

      const service = await Service.findById(serviceId);
      if (!service) {
        throw new BadRequestError("Service not exited!");
      }

      service.active = !service.active;
      await service.save();

      sendRes(res, null, { serviceId: serviceId, active: service.active });
    } catch (err: any) {
      console.log(err);

      sendRes(res, err);
      return;
    }
  }
}
