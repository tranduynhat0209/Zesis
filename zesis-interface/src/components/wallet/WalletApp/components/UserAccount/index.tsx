import React, { useState, useEffect } from "react";
import { Box } from "@mui/system";
import { Button, Typography, CircularProgress, Dialog } from "@mui/material";
import { useIdWalletContext } from "src/context/identity-wallet-context";

//icon
import zidenLogo from "src/assets/image/logo/ziden_logo_desktop_2x.png";
import CloseIcon from "@mui/icons-material/Close";
import userIcon from "src/assets/image/wallet/userAvatar2x.png";
import copyIcon from "src/assets/image/icons/copyIcon2x.png";
import { useSnackbar } from "notistack";
import { truncateString } from "src/utils/wallet/walletUtils";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";

import {
  BackupIcon,
  DeleteIcon,
  KeysIcon,
  LogoutIcon,
  MetamaskIcon,
  RevealMnemonicIcon,
} from "src/constants/icon";
import ConfirmReset from "../ConfirmReset";
import RevealMnemonic from "../RevealMnemonic";
import { userType } from "src/constants";
import KeysManagement from "../KeysManagement";
import { useWeb3Context } from "src/context/web3-context";
enum Page {
  MAIN = 0,
  REVEAL_MNEMONIC = 1,
  KEYS_MANAGEMENT = 2,
}
const UserAccount = () => {
  const { getZidenUserID, setOpen, lockWallet, backup, checkUserType } =
    useIdWalletContext();
  const { address, connectMetamask } = useWeb3Context();
  const { enqueueSnackbar } = useSnackbar();
  const [zidenDID, setZidenDID] = useState<string>("");
  const [isReset, setIsReset] = useState<Boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    async function fetch() {
      const a: string = await getZidenUserID();
      setZidenDID(a);
    }
    fetch();
  }, [getZidenUserID]);
  const [page, setPage] = useState<Page>(Page.MAIN);
  const handleBackup = async () => {
    setLoading(true);
    await backup();
    setLoading(false);
  };

  const buttonStyle = (theme: any) => {
    return {
      border: "none",
      color: "#FFFFFF",
      backgroundColor: "transparent",
      fontSize: "1rem",
      fontWeight: 500,
      lineHeight: "21px",
      display: "flex",
      justifyContent: "left",
      alignItems: "center",
      "&:hover": {
        border: "none",
        color: "#646A71",
        backgroundColor: "transparent",
        opacity: 0.9,
      },
      "& .MuiSvgIcon-root": {
        filter: "hue-rotate(130deg)",
      },
      mb: 1,
      pl: 0.5,
      position: "relative",
    };
  };
  return (
    <>
      {!isReset && (
        <Box
          sx={{
            width: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 0,
              mb: 3,
            }}
          >
            {page === Page.MAIN ? (
              <img
                style={{
                  borderRadius: "5px",
                }}
                width={"83px"}
                height={"25px"}
                src={zidenLogo}
                alt="Ziden"
              />
            ) : (
              <Button
                sx={{
                  minWidth: "0px",
                  backgroundColor: "inherit",
                  display: "flex",
                  justifyContent: "center",
                }}
                onClick={() => setPage(Page.MAIN)}
              >
                <ArrowBackIosIcon
                  sx={{
                    color: "#646A71",
                    width: "25px",
                  }}
                />
              </Button>
            )}

            <Button
              sx={{
                minWidth: "0px",
                mr: -1,
                backgroundColor: "transparent",
              }}
              onClick={() => setOpen(false)}
            >
              <CloseIcon
                sx={{
                  color: "#646A71",
                  fontSize: "1.4rem",
                }}
              />
            </Button>
          </Box>
          <Box
            sx={{
              py: 1,
              borderBottom: "1px solid #FAC3B2",
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              noWrap
              sx={{
                color: "#FFFFFFF",
                fontSize: "0.875rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
              }}
            >
              <img
                src={userIcon}
                width="34px"
                height="34px"
                style={{ marginRight: "15px", filter: "hue-rotate(130deg)" }}
                alt=""
              />
              {truncateString(zidenDID, 20)}
            </Typography>
            <Button
              sx={{
                minWidth: 0,
                backgroundColor: "transparent",
              }}
              onClick={() => {
                navigator.clipboard.writeText(zidenDID).then(() => {
                  enqueueSnackbar("User ID copied!", {
                    variant: "success",
                  });
                });
              }}
            >
              <img
                src={copyIcon}
                width="25px"
                height="25px"
                style={{ filter: "hue-rotate(130deg)" }}
                alt=""
              />
            </Button>
          </Box>
          {page === Page.MAIN && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                pt: 4,
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Button
                sx={buttonStyle}
                fullWidth
                onClick={handleBackup}
                variant="outlined"
              >
                <BackupIcon
                  sx={{
                    mr: 2,
                  }}
                />
                Back up
                {loading && (
                  <CircularProgress
                    size={"1rem"}
                    sx={{
                      ml: "1rem",
                      mt: "5px",
                    }}
                  />
                )}
              </Button>

              <Button
                sx={buttonStyle}
                fullWidth
                onClick={() => {
                  setPage(Page.KEYS_MANAGEMENT);
                }}
                variant="outlined"
              >
                <Box
                  sx={{
                    mr: 2.5,
                    ml: 0.5,
                  }}
                >
                  <KeysIcon />
                </Box>
                Keys Management
              </Button>

              {checkUserType() === userType.web && (
                <Button
                  sx={buttonStyle}
                  fullWidth
                  onClick={() => {
                    setPage(Page.REVEAL_MNEMONIC);
                  }}
                  variant="outlined"
                >
                  <RevealMnemonicIcon
                    sx={{
                      mr: 2,
                    }}
                  />
                  Reveal Recovery Phrase
                </Button>
              )}
              <Button
                sx={buttonStyle}
                fullWidth
                variant="outlined"
                onClick={() => {
                  if (!address) {
                    connectMetamask();
                  }
                }}
              >
                <Box sx={{ mr: 2 }}>
                  <MetamaskIcon />
                </Box>
                {!address ? "Connect Metamask" : truncateString(address, 20)}
              </Button>
              <Button
                sx={buttonStyle}
                fullWidth
                onClick={() => {
                  setIsReset(true);
                }}
                variant="outlined"
              >
                <DeleteIcon
                  sx={{
                    mr: 2,
                  }}
                />
                Delete Wallet
              </Button>
              <Button
                sx={buttonStyle}
                fullWidth
                onClick={() => {
                  // logout();
                  lockWallet();
                  setOpen(false);
                  // updateUserData();
                }}
                variant="outlined"
              >
                <LogoutIcon
                  sx={{
                    mr: 2,
                  }}
                />
                Lock wallet
              </Button>
            </Box>
          )}
          {/* {page === 2 && <RequirePassword setPage={setPage} />} */}
          {page === Page.REVEAL_MNEMONIC && (
            <RevealMnemonic setPage={setPage} />
          )}
          {page === Page.KEYS_MANAGEMENT && (
            <KeysManagement setPage={setPage} />
          )}
        </Box>
      )}
      {isReset && <ConfirmReset setIsReset={setIsReset} />}
    </>
  );
};

export default UserAccount;
