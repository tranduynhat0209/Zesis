import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Button,
  Collapse,
  Grid,
  Paper,
  Theme,
  Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import React, { useEffect, useState } from "react";
import { getAllUserClaim } from "src/utils/db/localStorageDb";
import { useIdWalletContext } from "src/context/identity-wallet-context";
import IdentityDetail from "src/components/IdentityDetail";
import { useDeviceContext } from "src/context/deviceContext";
import { zidenIssuer, zidenPortal } from "src/client/api";
import { ArrowDownIcon, ArrowRightIcon, EmptyIcon } from "src/constants/icon";
import SearchBar from "src/components/SearchBar";
import { utils as zidenUtils } from "@zidendev/zidenjs";
import { Entry } from "@zidendev/zidenjs/build/claim/entry";
import UnlockWalletWarning from "../UnlockWalletWarning";
import LoadingClaim from "../LoadingClaim";
import { truncateString } from "src/utils/wallet/walletUtils";

export const getStatusColor = (status: string) => {
  const useable = ["ACTIVE", "PENDING REVOKE"];
  const pendingUse = ["PENDING", "REVIEWING"];
  const notUseable = ["REVOKED"];
  if (useable.includes(status)) {
    return "#00D45E";
  }
  if (pendingUse.includes(status)) {
    return "#FF9300";
  }
  if (notUseable.includes(status)) {
    return "#F44560";
  }
  return "gray";
};
//style
const accordionStyle = (theme: Theme) => {
  return {
    "& .MuiAccordionSummary-root": {
      borderRadius: 4,
      px: { xs: 3, sm: 4 },
    },
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
      fontSize: "4rem",
      fontWeight: 300,
      color: "#F7A088",
    },
    "& .Mui-expanded .MuiTypography-root": {
      color: "#FFFFFC",
    },
    "& .Mui-expanded .MuiButton-root": {
      color: "#FFFFFF",
      border: "1px solid #FFFFFF",
    },
  };
};
const desktopStyle = (theme: Theme) => {
  return {
    height: "500px",
    overflowY: "scroll",
    paddingLeft: "-10px",
    pr: "8px",
    pt: "2px",
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
  };
};
const OnDevice = ({ refresh }: { refresh?: number }) => {
  const { isUnlocked, keyContainer, getZidenUserID } = useIdWalletContext();
  const [selected, setSelected] = useState(-1);
  const [open, setOpen] = React.useState(false);
  const [metaData, setMetaData] = useState<Array<any>>([]);
  const [filteredData, setFilteredData] = useState<Array<any>>([]);
  const [allClaimDatas, setAllClaimData] = useState<Array<any>>([]);
  const [displayClaim, setDisplayClaim] = useState<any>();
  const [loading, setLoading] = useState(true);
  const { isDesktop } = useDeviceContext();

  //Decrypt all claim from LocalStorage
  const checkAllClaims = React.useCallback(async () => {
    setLoading(true);
    const allClaims = getAllUserClaim();
    if (allClaims.length === 0) {
      setLoading(false);
      return;
    }
    if (!isUnlocked) {
      setMetaData([]);
      setAllClaimData([]);
      setLoading(false);
      return;
    } else {
      const userId = await getZidenUserID();
      const allClaimDecrypted: any = allClaims.map((item) => {
        try {
          const dataDecrypted = JSON.parse(
            keyContainer.decryptWithDataKey(item.claimEncrypted)
          );
          return {
            id: item.id,
            claim: JSON.parse(dataDecrypted.claim),
            issuerID: dataDecrypted.issuerID,
            schemaHash: dataDecrypted.schemaHash,
          };
        } catch (err) {
          return false;
        }
      });
      const resutMetaData = await zidenIssuer.get(`/claims?holderId=${userId}`);
      let claimMetaData = await Promise.all(
        allClaimDecrypted.map(async (item: any, index: number) => {
          try {
            const metadata: any = resutMetaData.data.find((element: any) => {
              return element.claimId === item.id;
            });
            const userClaimArr = item.claim.claim.map((item: any) => {
              return zidenUtils.hexToBuffer(item, 32);
            });
            const userClaim = new Entry(userClaimArr);
            const updateable = userClaim.getFlagUpdatable();
            const version = userClaim.getVersion();
            let issuerId = metadata?.issuerId;
            let issuerData = await zidenIssuer.get(
              `issuers/${issuerId}/profile`
            );
            let issuerName = issuerData?.data?.name;
            return {
              name: metadata?.schemaHash,
              issuerId,
              issuerName,
              status:
                parseInt(userClaim.getExpirationDate().toString(10)) <
                Date.now()
                  ? "Expired"
                  : metadata?.status,
              claimData: {
                ...item,
                updateable: updateable,
                version: version,
                expireDate: parseInt(
                  userClaim.getExpirationDate().toString(10)
                ),
                schemaHash: metadata?.schemaHash,
              },
            };
          } catch (err) {
            return { fail: true };
          }
        })
      );
      claimMetaData = claimMetaData.filter((item: any) => !item.fail);
      setMetaData(claimMetaData);
      setAllClaimData(allClaimDecrypted);
      setLoading(false);
    }
    setLoading(false);
  }, [isUnlocked, keyContainer, getZidenUserID]);
  useEffect(() => {
    checkAllClaims();
  }, [checkAllClaims, refresh]);

  useEffect(() => {
    setOpen(false);
    setSelected(-1);
  }, [filteredData]);
  const handleClick = (e: any, index: number, status: string, data: any) => {
    setSelected(selected === index ? -1 : index);
    if (allClaimDatas) {
      setDisplayClaim({
        ...data,
        status: status,
      });
    }
    setOpen(selected === index ? false : true);
  };
  return (
    <Box
      sx={{
        px: {
          xs: 1,
          xsm: 1,
          md: 2,
          lg: 0,
        },
        py: 4,
        minHeight: "calc(100vh - 420px)",
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      {metaData?.length > 0 && (
        <>
          <Grid
            container
            sx={{
              display: isDesktop ? "flex" : "none",
            }}
          >
            <Grid item xs={12} sm={12} lg={5} xl={4} sx={desktopStyle}>
              {metaData.map((data, index) => {
                return (
                  <Button
                    id={"identity-button-" + index}
                    variant="contained"
                    key={data.name + index}
                    sx={(theme) => ({
                      maxWidth: "900px",
                      width: "100%",
                      height: "110px",
                      backgroundColor:
                        selected === index
                          ? "#9c1914"
                          : theme.palette.background.paper,
                      boxShadow: "0px 2px 8px #0000001F",
                      borderRadius: 4,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      pl: 4,
                      ml: "1px",
                      mb: 2,
                      "&:hover": {
                        background:
                          selected === index
                            ? "#9c1914"
                            : theme.palette.background.paper,
                        filter: "brightness(1.2)",
                      },
                      scrollMargin: "2px",
                      scrollSnapAlign: "start",
                      opacity: 1,
                    })}
                    onClick={(e) => {
                      handleClick(e, index, data.status, data.claimData);
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          color:
                            selected === index
                              ? "text.primary"
                              : "text.secondary",
                          letterSpacing: "0px",
                          opacity: 1,
                        }}
                        variant="h4"
                        textAlign={"left"}
                      >
                        {truncateString(data.name, 20)}
                      </Typography>
                      <Typography
                        sx={{
                          color: selected === index ? "#FFFFFC" : "#646A71",
                          letterSpacing: "0px",
                          opacity: 1,
                        }}
                        variant="small"
                      >
                        Issued by{" "}
                        <span style={{ fontWeight: 500 }}>
                          {data.issuerName}
                        </span>
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          pt: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: getStatusColor(data.status),
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            color: getStatusColor(data.status),
                            ml: 1,
                          }}
                        >
                          {data.status.charAt(0) +
                            data.status.substring(1).toLowerCase()}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        mr: 1,
                      }}
                    >
                      <ArrowRightIcon />
                    </Box>
                  </Button>
                );
              })}
            </Grid>
            <Grid item xs={12} sm={12} lg={7} xl={8}>
              <Collapse in={open} sx={{ marginTop: "1px" }}>
                <Paper
                  sx={{
                    backgroundColor: "FFFFFF",
                    p: 3,
                    ml: 1,
                    boxShadow: "0px 2px 8px #0000001F",
                    borderRadius: 4,
                  }}
                >
                  <IdentityDetail data={displayClaim} />
                </Paper>
              </Collapse>
            </Grid>
          </Grid>
          <Grid
            container
            spacing={2}
            sx={{ display: isDesktop ? "none" : "block" }}
          >
            {metaData?.map((data, index) => {
              return (
                <Grid item xs={12} key={data.name + index}>
                  <Accordion sx={accordionStyle}>
                    <Box
                      color="primary"
                      sx={{
                        width: "100%",
                      }}
                    >
                      <AccordionSummary
                        expandIcon={
                          <ArrowDownIcon
                            sx={{ width: "34px", height: "17px" }}
                          />
                        }
                        sx={{
                          width: "100%",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            mr: 2,
                          }}
                        >
                          <Typography
                            sx={{
                              letterSpacing: "0px",
                              opacity: 1,
                            }}
                            variant="h4"
                          >
                            {truncateString(data.name, 20)}
                          </Typography>
                          <Typography
                            sx={{
                              letterSpacing: "0px",
                              opacity: 1,
                            }}
                            variant="small"
                          >
                            Issued by {data.issuerName}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              pt: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: getStatusColor(data.status),
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                color: getStatusColor(data.status),
                                ml: 1,
                              }}
                            >
                              {data.status.charAt(0) +
                                data.status.substring(1).toLowerCase()}
                            </Typography>
                          </Box>
                        </Box>
                      </AccordionSummary>
                    </Box>
                    <AccordionDetails
                      sx={{
                        px: { lg: 5, xs: 3, sm: 4 },
                      }}
                    >
                      {allClaimDatas && (
                        <IdentityDetail
                          data={{
                            ...data.claimData,
                            status: data.status,
                          }}
                        />
                      )}
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
      {metaData?.length === 0 && !loading && isUnlocked && (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "center",
            pt: 5,
          }}
        >
          <EmptyIcon />
          <Typography mt={1} variant="h3">
            You have no claim
          </Typography>
        </Box>
      )}
      {loading && <LoadingClaim />}
      {!isUnlocked && <UnlockWalletWarning />}
    </Box>
  );
};

export default OnDevice;
