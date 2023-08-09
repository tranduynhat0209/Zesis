import { Box } from "@mui/system";
import React, { useEffect, useState } from "react";
import Header from "src/components/Header";
import { useHistory, useParams } from "react-router-dom";
import {
  Query,
  SignedChallenge,
  auth,
  queryMTP,
  schema,
} from "@zidendev/zidenjs";
import queryString from "query-string";
import {
  Button,
  Paper,
  Typography,
  Grid,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
} from "@mui/material";

import launchIcon from "src/assets/image/icons/lauch2x.png";

import { useIdWalletContext } from "src/context/identity-wallet-context";
import { zidenIssuer, zidenIssuerNew, zidenPortal } from "src/client/api";
import { getAllUserClaim } from "src/utils/db/localStorageDb";
import { utils as zidenUtils } from "@zidendev/zidenjs";
import { Entry } from "@zidendev/zidenjs/build/claim/entry";
import { useSnackbar } from "notistack";
import LoadingComponent from "src/components/LoadingComponent";
import { useDeviceContext } from "src/context/deviceContext";
import { userType } from "src/constants";
import { LoadingButton } from "@mui/lab";
import AttestModal from "./components/AttestModal";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  CheckIcon,
  DotLoadingIcon,
  DotLoadingIconLight,
  NotCheckIcon,
} from "src/constants/icon";
import RequirementDetail from "./components/RequirementDetail";
import {
  flattenData,
  generateProof,
  parseIssuerClaimMtp,
  parseNonRevMtp,
} from "src/utils/claim";

//All progress status
export enum AttestStatus {
  Pending = "Pending",
  Executing = "Executing",
  Success = "Success",
  Fail = "Fail",
}

const Attestation = () => {
  const param: any = useParams();
  const { isDesktop } = useDeviceContext();
  const { keyContainer, isUnlocked, updateUserData, checkUserType } =
    useIdWalletContext();
  const history = useHistory();
  //state
  const [requireData, setRequireData] = useState<any>();
  const [processedRequireData, setProcessedRequireData] = useState<any>();
  const [requestData, setRequestData] = useState<any>({});
  const [endpointURLs, setEndpointURLs] = useState<any>();
  const [allClaims, setAllclaims] = useState<any>();
  const [oraiUserSig, setOraiUserSig] = useState<any>();
  const [geningProofStatus, setGeningProofStatus] = useState<AttestStatus>(
    AttestStatus.Pending
  );
  const [isSigning, seIsSigning] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<AttestStatus>(
    AttestStatus.Pending
  );
  const [txHash, setTxHash] = useState<string | undefined>();
  const [isProofGenerated, setIsProofGenerated] = useState<boolean>(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [openDetail, setOpenDetail] = React.useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const [providerData, setProviderData] = useState<any>();
  /**
   * Get challenge from message
   */
  const getChallengeFromMessage = (message: any): BigInt => {
    let hashData = window.zidenParams.F.toObject(
      window.zidenParams.hasher([
        BigInt(zidenUtils.stringToHex(JSON.stringify(message))),
      ])
    ).toString(2);
    let bitRemove = hashData.length < 128 ? 0 : hashData.length - 128;
    let hashDataFixed = BigInt(
      "0b" + hashData.slice(0, hashData.length - bitRemove)
    );
    let value = BigInt(hashDataFixed);
    return value;
  };
  const handleVerify = React.useCallback(
    async (proofs: any) => {
      setVerifyStatus(AttestStatus.Executing);
      if (proofs && proofs.zkProofs.length > 0) {
        try {
          const res = await zidenPortal.post("/proofs/submit", proofs);
          if (res.data.isValid === true) {
            setVerifyStatus(AttestStatus.Success);
            enqueueSnackbar(`Generate proof successfuly`, {
              variant: "success",
            });
            if (res.data.tx) {
              setTxHash(res.data.tx.hash);
            }
          } else {
            setVerifyStatus(AttestStatus.Fail);
          }
        } catch (err) {
          setVerifyStatus(AttestStatus.Fail);
        }
      } else {
        setVerifyStatus(AttestStatus.Fail);
      }
    },
    [enqueueSnackbar]
  );
  /**
   * input: data of claim, current requirement
   * output: witness if valid
   */
  const checkClaimValidation = React.useCallback(
    async (claimData: any, requirement: any) => {
      const schemas: any = await zidenPortal.get(
        `/schemas/${requirement.schemaHash}`
      );
      const slotData = flattenData(
        schema.schemaPropertiesSlot(schemas.data?.schema?.jsonSchema)
      )[requirement.name];
      const challenge = getChallengeFromMessage(requestData.message);
      if (isUnlocked && claimData) {
        //get issuer claim from claim data
        const issuerClaimArr = claimData.claim.claim.map((item: any) => {
          return zidenUtils.hexToBuffer(item, 32);
        });
        try {
          const issuerClaim = new Entry(issuerClaimArr);
          const userTree = await keyContainer.getUserTree();
          let sig: SignedChallenge;
          const activeAuth = keyContainer.getActiveAuth();
          const parsedValue = requirement.value.map((item: any) =>
            BigInt(item)
          );

          const privateKeyHex = keyContainer.getActiveKeyDecrypted();
          const privateKey = zidenUtils.hexToBuffer(privateKeyHex, 32);

          const signature = await auth.signChallenge(privateKey, challenge);
          sig = {
            challengeSignatureR8x: signature.challengeSignatureR8x,
            challengeSignatureR8y: signature.challengeSignatureR8y,
            challengeSignatureS: signature.challengeSignatureS,
            challenge: challenge,
          } as SignedChallenge;

          const query: Query = {
            slotIndex: slotData?.slot || 0,
            operator: requirement.operator,
            values: parsedValue,
            valueTreeDepth: 6,
            from: slotData?.begin || 0,
            to: slotData?.end || 1,
            timestamp: 0,
            claimSchema: BigInt(String(requirement.schemaHash)),
          };

          const witness =
            await queryMTP.holderGenerateQueryMTPWitnessWithSignature(
              issuerClaim,
              sig,
              activeAuth,
              userTree,
              parseIssuerClaimMtp(requirement.issuerClaimMtp),
              parseNonRevMtp(requirement.nonRevMtp),
              query
            );
          return {
            witness: witness,
            valid: true,
          };
        } catch (err) {
          console.error(err);
          return {
            valid: false,
            err: err,
          };
        }
      }
    },
    [checkUserType, keyContainer, isUnlocked, oraiUserSig, requestData]
  );

  const handleConfirm = React.useCallback(async () => {
    const pr = processedRequireData.map(async (item: any) => {
      return checkClaimValidation(item.validClaim, item).then((res) => {
        if (res?.valid) {
          try {
            console.log(res.witness);
            return generateProof(res.witness);
          } catch (err) {
            throw err;
          }
        } else {
          console.log("invalid witness:", item);
        }
      });
    });
    Promise.allSettled(pr).then(async (res: any) => {
      if (res[0].value) {
        const zkProof = res.map((data: any) => {
          return {
            proof: data.value.proof,
            publicData: data.value.publicSignals,
          };
        });
        setGeningProofStatus(AttestStatus.Success);
        setIsProofGenerated(true);
        await handleVerify({
          zkProofs: zkProof,
          requestId: requestData?.requestId,
        });
      } else {
        enqueueSnackbar(`Generate proof failed, check requirements!`, {
          variant: "error",
        });
        setGeningProofStatus(AttestStatus.Fail);
      }
    });
  }, [
    enqueueSnackbar,
    handleVerify,
    checkClaimValidation,
    processedRequireData,
    requestData,
  ]);

  /**
   * execute action base on status: generate proof, wating, verify proof, etc.
   */
  useEffect(() => {
    const actionOnStatus = async () => {
      if (checkUserType() === userType.oraiWeb) {
        if (
          geningProofStatus === AttestStatus.Executing &&
          !isSigning &&
          oraiUserSig
        ) {
          setOpen(true);
          await handleConfirm();
        }
      } else {
        if (geningProofStatus === AttestStatus.Executing) {
          setOpen(true);
          await handleConfirm();
        }
      }
    };
    actionOnStatus();
  }, [isSigning, oraiUserSig, geningProofStatus, checkUserType, handleConfirm]);

  /**
   * redirect user to request page with appropriate schema
   */
  const handleLaunch = React.useCallback(
    async (schemaHash: string, allowedIssuers: Array<string>) => {
      const allRegistries = await zidenPortal.get(
        `/registries?schemaHash=${schemaHash}`
      );
      for (const registry of allRegistries.data?.registries) {
        if (allowedIssuers.includes(registry.registry?.issuer?.issuerId)) {
          const registryId = registry?.registry?.registryId;
          history.push(`/holder/identity/provider/request/${registryId}`);
          break;
        }
      }
    },
    [history]
  );
  /**
   * get verifier data and all requirements of the service
   */
  useEffect(() => {
    const fetchRequireData = async () => {
      let reqId: any =
        queryString.parse(history.location.search)["requestId"] || "";
      if (reqId) {
        const res = await zidenPortal.get(`/proofs/${reqId}`);
        if (res.data) {
          setRequestData(res.data.request);
        }
      } else {
        const res = await zidenPortal.post(`/proofs/request`, {
          serviceId: param.id,
        });
        setRequestData(res.data.request);
      }
      const serviceDetail = await zidenPortal.get(`services/${param.id}`);
      setProviderData({
        title: serviceDetail?.data?.service?.name,
        description: serviceDetail?.data?.service?.description,
        logo: serviceDetail?.data?.service?.verifier?.logoUrl,
        hostBy: serviceDetail?.data?.service?.verifier?.name,
      });
      //set endpoint url
      setEndpointURLs(serviceDetail?.data?.endpointUrl);
      //set require Data
      const requirements = await Promise.all(
        serviceDetail?.data?.service?.requirements?.map(
          async (requirement: any) => {
            for (let i = 0; i < requirement.allowedIssuers.length; i++) {
              let id = requirement.allowedIssuers[i].issuerId;
              let issuerData = await zidenIssuer.get(`issuers/${id}/profile`);
              requirement.allowedIssuers[i].name = issuerData?.data?.name;
            }
            return {
              name: requirement.query.propertyName,
              displayName: requirement.title,
              require: requirement.attestation,
              issuer: requirement.allowedIssuers,
              schemaHash: requirement.schemaHash,
              filled: "checking",
              launch: (
                <Button
                  sx={{
                    minWidth: "0px",
                    backgroundColor: "transparent",
                  }}
                  onClick={() => {
                    handleLaunch(
                      requirement.schemaHash,
                      requirement.allowedIssuers.map(
                        (item: any) => item.issuerId
                      )
                    );
                  }}
                >
                  <img src={launchIcon} alt="" width="18px" height="18px" />
                </Button>
              ),
              value: requirement.query.value,
              operator: requirement.query.operator,
            };
          }
        )
      );
      setRequireData(requirements);
      setProcessedRequireData(requirements);
      return requirements;
    };
    fetchRequireData();
  }, [param, isUnlocked, keyContainer, handleLaunch, history]);

  /**
   * Decode all user claim from Local Storage, save to allClaims state
   */
  useEffect(() => {
    updateUserData();
    const checkAllClaims = async () => {
      const allClaims = getAllUserClaim();
      if (!isUnlocked) {
        enqueueSnackbar("please unlock your wallet", {
          variant: "warning",
          preventDuplicate: true,
        });
      } else {
        const allClaimDecrypted = allClaims.map((item) => {
          const dataDecrypted = JSON.parse(
            keyContainer.decryptWithDataKey(item.claimEncrypted)
          );
          return {
            id: item.id,
            claim: JSON.parse(dataDecrypted.claim),
            issuerID: dataDecrypted.issuerID,
          };
        });
        setAllclaims(allClaimDecrypted);
      }
    };
    checkAllClaims();
  }, [isUnlocked, keyContainer, enqueueSnackbar, updateUserData]);

  /**
   *for each requirement:
      filter all claim for:
        - allowed issuers
        - matching schema hashes
        - publish status (if claim is on blocked yet)
        - expire date (if claim has expired or not)
        - check claim attesting value based on corresponding require operator:  matching, greater than, less than, in range etc.
      if pass, return nessesary claim data for generating proof
    return an array of requirements and corresponding valid claim data , pass that array to processedRequireData state 
   */
  useEffect(() => {
    const getUpdatedRequireData = async () => {
      if (allClaims?.length > 0 && requireData?.length > 0) {
        const updatedData = await Promise.all(
          requireData.map(async (data: any) => {
            for (var i = 0; i < allClaims.length; i++) {
              const claim = allClaims[i];
              // check allow issuer ID
              if (
                !data.issuer
                  ?.map((issuer: any) => issuer.issuerId)
                  .includes(claim.issuerID)
              ) {
                continue;
              }
              const issuerClaimArr = claim.claim?.claim?.map((item: any) => {
                return zidenUtils.hexToBuffer(item, 32);
              });
              const issuerClaim = new Entry(issuerClaimArr);
              let schemaHash = zidenUtils
                .bitsToNum(issuerClaim.getSchemaHash())
                .toString();
              // check schema hash
              if (schemaHash !== data.schemaHash) {
                continue;
              }
              //check claim mtp and nonrev mtp
              let mtpInput, nonRevInput;

              let flattenedRawData = flattenData(claim?.claim?.rawData);
              try {
                const claimMtp = await zidenIssuerNew.get(
                  `/claims/${claim.id}/proof?type=mtp`
                );
                mtpInput = claimMtp.data?.kycQueryMTPInput;
                const claimNonRevMtp = await zidenIssuerNew.get(
                  `/claims/${claim.id}/proof?type=nonRevMtp`
                );
                nonRevInput = claimNonRevMtp.data?.kycQueryMTPInput;
              } catch (err) {
                continue;
              }
              const dataToCheck = parseInt(flattenedRawData[data.name]);
              // check expiration time
              if (
                parseInt(issuerClaim.getExpirationDate().toString(10)) <
                Date.now()
              ) {
                continue;
              }
              // check operator
              switch (data.operator) {
                case 0:
                  return {
                    ...data,
                    validClaim: claim,
                    filled: "checked",
                    issuerClaimMtp: mtpInput,
                    nonRevMtp: nonRevInput,
                  };
                case 1:
                  if (dataToCheck === data.value[0]) {
                    return {
                      ...data,
                      validClaim: claim,
                      filled: "checked",
                      issuerClaimMtp: mtpInput,
                      nonRevMtp: nonRevInput,
                    };
                  }
                  break;
                case 2:
                  if (dataToCheck < data.value[0]) {
                    return {
                      ...data,
                      validClaim: claim,
                      filled: "checked",
                      issuerClaimMtp: mtpInput,
                      nonRevMtp: nonRevInput,
                    };
                  }
                  break;
                case 3:
                  if (dataToCheck > data.value[0]) {
                    return {
                      ...data,
                      validClaim: claim,
                      filled: "checked",
                      issuerClaimMtp: mtpInput,
                      nonRevMtp: nonRevInput,
                    };
                  }
                  break;
                case 4:
                  if (data.value.includes(dataToCheck)) {
                    return {
                      ...data,
                      validClaim: claim,
                      filled: "checked",
                      issuerClaimMtp: mtpInput,
                      nonRevMtp: nonRevInput,
                    };
                  }
                  break;
                case 5:
                  if (!data.value.includes(dataToCheck)) {
                    return {
                      ...data,
                      validClaim: claim,
                      filled: "checked",
                      issuerClaimMtp: mtpInput,
                      nonRevMtp: nonRevInput,
                    };
                  }
                  break;
                case 6:
                  if (
                    (data.value[0] - dataToCheck) *
                      (data.value[1] - dataToCheck) <=
                    0
                  ) {
                    return {
                      ...data,
                      validClaim: claim,
                      filled: "checked",
                      issuerClaimMtp: mtpInput,
                      nonRevMtp: nonRevInput,
                    };
                  }
                  break;
                default:
                  break;
              }
            }
            return {
              ...data,
              filled: "notChecked",
            };
          })
        );
        setProcessedRequireData(updatedData);
      } else {
        const updatedData = requireData?.map((data: any) => {
          return {
            ...data,
            filled: "notChecked",
          };
        });
        setProcessedRequireData(updatedData);
      }
    };
    getUpdatedRequireData();
  }, [requireData, endpointURLs, allClaims]);

  const handleClick = async () => {
    try {
      setVerifyStatus(AttestStatus.Pending);
      setGeningProofStatus(AttestStatus.Executing);
    } catch (err) {
      setGeningProofStatus(AttestStatus.Fail);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
      }}
    >
      <AttestModal
        open={open}
        setOpen={setOpen}
        geningProofStatus={geningProofStatus}
        verifyStatus={verifyStatus}
        txHash={txHash}
      />
      {providerData && (
        <Header
          title1={providerData.title}
          by={providerData.hostBy}
          description={[providerData.description]}
        >
          <Avatar
            src={providerData.logo}
            alt=""
            style={{
              borderRadius: "50%",
              border: "1px solid #6C8EC1",
              width: "130px",
              height: "130px",
            }}
          />
        </Header>
      )}
      {!providerData && <LoadingComponent type={2} />}
      <Box
        sx={{
          p: {
            xs: 2,
            xsm: 2,
            md: 3,
            lg: 6,
          },
        }}
      >
        <Grid
          container
          sx={{
            display: isDesktop ? "flex" : "none",
          }}
        >
          <Grid
            item
            xs={12}
            sm={12}
            lg={5}
            xl={4}
            sx={{
              height: "500px",
              overflowY: "scroll",
              px: "8px",
              pt: "1px",
              scrollSnapType: "y mandatory",
              "&::-webkit-scrollbar": {
                height: "0px",
                width: "4px",
                display: "initial",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "rgb(17,72,152, 0.2)",
                borderRadius: "3px",
              },
            }}
          >
            {processedRequireData &&
              processedRequireData?.map((data: any, index: number) => {
                return (
                  <Button
                    variant="contained"
                    key={index}
                    sx={(theme) => ({
                      maxWidth: "900px",
                      width: "100%",
                      height: "100px",
                      backgroundColor:
                        selected === index
                          ? theme.palette.background.secondary
                          : theme.palette.background.paper,
                      "&:hover": {
                        background:
                          selected === index
                            ? theme.palette.background.secondary
                            : theme.palette.background.paper,
                        filter: "brightness(1.2)",
                      },
                      boxShadow: "0px 2px 8px #0000001F",
                      borderRadius: 4,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      pl: 4,
                      mb: 2,

                      scrollMargin: "2px",
                      scrollSnapAlign: "start",
                      opacity: 1,
                    })}
                    onClick={(e) => {
                      setSelected(selected === index ? -1 : index);
                      setOpenDetail(selected === index ? false : true);
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        {data.filled === "checking" &&
                          isUnlocked &&
                          selected !== index && (
                            <DotLoadingIcon sx={{ transform: "scale(0.8)" }} />
                          )}
                        {data.filled === "checking" &&
                          isUnlocked &&
                          selected === index && (
                            <DotLoadingIconLight
                              sx={{ transform: "scale(0.8)" }}
                            />
                          )}
                        {data.filled === "checked" && isUnlocked && (
                          <CheckIcon />
                        )}
                        {(data.filled === "notChecked" || !isUnlocked) && (
                          <NotCheckIcon />
                        )}
                        <Typography
                          sx={{
                            color:
                              selected === index
                                ? "text.primary"
                                : "text.secondary",
                            letterSpacing: "0px",
                            opacity: 1,
                            ml: 2,
                          }}
                          variant="h4"
                          textAlign={"left"}
                        >
                          {data.displayName}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          mr: 1,
                        }}
                      >
                        <ArrowRightIcon />
                      </Box>
                    </Box>
                  </Button>
                );
              })}
          </Grid>
          <Grid
            item
            xs={12}
            sm={12}
            lg={7}
            xl={8}
            sx={{
              pt: "1px",
            }}
          >
            {processedRequireData && (
              <Collapse in={openDetail}>
                <Paper
                  sx={{
                    ml: 1,
                    backgroundColor: "FFFFFF",
                    p: 3,
                    boxShadow: "0px 2px 8px #0000001F",
                    borderRadius: 4,
                    height: "500px",
                  }}
                >
                  <RequirementDetail
                    detailData={processedRequireData[selected]}
                  />
                </Paper>
              </Collapse>
            )}
          </Grid>
        </Grid>
        <Grid
          container
          sx={{
            display: isDesktop ? "none" : "flex",
            flexDirection: "column",
          }}
        >
          {processedRequireData &&
            processedRequireData?.map((data: any, index: number) => {
              return (
                <Accordion
                  key={index}
                  sx={{
                    "& .MuiAccordionSummary-root": {
                      borderRadius: 4,
                      px: { xs: 3, sm: 4 },
                    },
                    mb: 2,
                    "& .MuiAccordionSummary-root.Mui-expanded": {
                      background: "#9c1914 0% 0% no-repeat padding-box",
                    },
                    "&.MuiPaper-root": {
                      borderRadius: 4,
                      boxShadow: "0px 2px 8px #0000001F",
                    },
                    "&.MuiAccordion-root:before": {
                      position: "relative",
                    },
                    "&	.MuiSvgIcon-root": {
                      fontWeight: 300,
                      color: "#F7A088",
                    },
                    "& .Mui-expanded .MuiTypography-root": {
                      color: "#FFFFFC",
                    },
                    "& .Mui-expanded #dotLoading path": {
                      fill: "#fff",
                    },
                    "& .Mui-expanded #dotLoading circle": {
                      fill: "#fff",
                    },

                    "& .Mui-expanded .MuiButton-root": {
                      color: "#FFFFFF",
                      border: "1px solid #FFFFFF",
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={
                      <ArrowDownIcon sx={{ width: "34px", height: "17px" }} />
                    }
                    sx={{
                      width: "100%",
                      height: "90px",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        mr: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        {data.filled === "checking" && isUnlocked && (
                          <DotLoadingIcon
                            sx={{ transform: "scale(0.8)", color: "#ffffff" }}
                          />
                        )}
                        {data.filled === "checked" && isUnlocked && (
                          <CheckIcon
                            sx={{
                              width: "20px",
                              height: "20px",
                            }}
                          />
                        )}
                        {data.filled === "notChecked" && isUnlocked && (
                          <NotCheckIcon
                            sx={{
                              width: "20px",
                              height: "20px",
                            }}
                          />
                        )}
                        <Typography
                          sx={{
                            letterSpacing: "0px",
                            opacity: 1,
                            ml: 2,
                          }}
                          variant="h4"
                          textAlign={"left"}
                        >
                          {data.displayName}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails
                    sx={{
                      px: 5,
                    }}
                  >
                    <RequirementDetail
                      detailData={processedRequireData[index]}
                    />
                  </AccordionDetails>
                </Accordion>
              );
            })}
        </Grid>
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            width: "100%",
            pt: 3,
            pr: 1,
          }}
        >
          <LoadingButton
            loading={
              geningProofStatus === AttestStatus.Executing ||
              verifyStatus === AttestStatus.Executing
            }
            disabled={
              !isUnlocked ||
              geningProofStatus === AttestStatus.Executing ||
              verifyStatus === AttestStatus.Executing
            }
            variant="contained"
            onClick={handleClick}
          >
            Generate proof
          </LoadingButton>
        </Box>
      </Box>
    </Box>
  );
};

export default Attestation;
