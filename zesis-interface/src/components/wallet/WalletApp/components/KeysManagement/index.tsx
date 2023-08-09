import { Check } from "@mui/icons-material";
import {
  Button,
  List,
  ListItem,
  TextField,
  Theme,
  Typography,
  Box,
  SxProps,
} from "@mui/material";
import { useCallback, useState } from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useIdWalletContext } from "src/context/identity-wallet-context";
import { Auth } from "@zidendev/zidenjs";
import { useSnackbar } from "notistack";
import { useWeb3Context } from "src/context/web3-context";
import { getStateTransactionCalldata } from "src/utils/snark";
import { LoadingButton } from "@mui/lab";

const keyStyle: SxProps<Theme> = (theme: Theme) => {
  return {
    width: "100%",
    display: "flex",
    borderRadius: "3px",
    justifyContent: "space-between",
    alignItems: "center",
    color: theme.palette.text.secondary,
    "&:hover": {
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.secondary.contrastText,
      py: "3px",
      px: "7px",
    },
  };
};

const Password = ({
  setPassword,
  helperText,
  password,
  showPassword,
  setShowPassword,
}: any) => {
  return (
    <Box
      width={"100%"}
      sx={{
        mt: 2,
      }}
    >
      <TextField
        fullWidth
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type={showPassword ? "text" : "password"}
        InputProps={{
          endAdornment: (
            <Button
              onMouseDown={() => {
                setShowPassword(true);
              }}
              onMouseUp={() => {
                setShowPassword(false);
              }}
              onTouchStart={() => {
                setShowPassword(true);
              }}
              onTouchEnd={() => {
                setShowPassword(false);
              }}
              sx={{
                backgroundColor: "inherit",
                minWidth: "0px",
              }}
            >
              {showPassword ? (
                <VisibilityOffIcon
                  sx={{
                    color: "#9A9A9A",
                  }}
                />
              ) : (
                <VisibilityIcon
                  sx={{
                    color: "#9A9A9A",
                  }}
                />
              )}
            </Button>
          ),
        }}
      />
      {helperText !== "" && (
        <Typography variant="body2" color="#D60000">
          {helperText}
        </Typography>
      )}
    </Box>
  );
};
const KeysManagement = ({ setPage }: any) => {
  const { keyContainer, backup } = useIdWalletContext();
  const auths = keyContainer.getAuthClaims();
  const activeAuth = keyContainer.getActiveAuth();

  const [loading, setLoading] = useState(false);
  const [focusedKey, setFocusedKey] = useState<BigInt | undefined>();
  const [newKey, setNewKey] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean | undefined>();
  const [helperText, setHelperText] = useState<string | undefined>();
  const { enqueueSnackbar } = useSnackbar();

  const { useStateContract } = useWeb3Context();
  const contract = useStateContract();

  const publish = useCallback(
    async (witness: any) => {
      if (contract) {
        const { a, b, c, publicInputs } = await getStateTransactionCalldata(
          witness
        );
        const tx = await contract.transitState(
          publicInputs[0],
          publicInputs[1],
          publicInputs[2],
          publicInputs[3] === BigInt(0) ? false : true,
          a,
          // @ts-ignore
          b,
          c
        );
        await tx.wait();
        enqueueSnackbar("A new key generated on chain", {
          variant: "success",
        });
      } else {
        throw new Error("Failed to fetch state contract");
      }
    },
    [contract]
  );
  const handleAddKey = async () => {
    if (keyContainer.checkPassword(password)) {
      setLoading(true);
      try {
        await keyContainer.addNewKey(publish);
        enqueueSnackbar("Key generated", {
          variant: "success",
        });
        await backup();
      } catch (err) {
        enqueueSnackbar((err as Error).message, {
          variant: "error",
        });
      }
      setNewKey(false);
      setHelperText(undefined);
      setPassword("");
      setLoading(false);
    } else {
      setHelperText("Incorrect password");
    }
  };

  const handleActivateKey = () => {
    if (keyContainer.checkPassword(password)) {
      try {
        keyContainer.activateKey(parseInt(focusedKey!.toString()));
        enqueueSnackbar(`Activated key ${focusedKey!.toString()}`, {
          variant: "success",
        });
      } catch (err) {
        enqueueSnackbar((err as Error).message, {
          variant: "error",
        });
      }
      setFocusedKey(undefined);
      setHelperText(undefined);
      setPassword("");
    } else {
      setHelperText("Incorrect password");
    }
  };

  const handleDeleteKey = async () => {
    if (keyContainer.checkPassword(password)) {
      setLoading(true);
      try {
        await keyContainer.removeKey(parseInt(focusedKey!.toString()), publish);
        enqueueSnackbar("Key deleted", {
          variant: "success",
        });
        await backup();
      } catch (err) {
        enqueueSnackbar((err as Error).message, {
          variant: "error",
        });
      }
      setFocusedKey(undefined);
      setHelperText(undefined);
      setPassword("");
      setLoading(false);
    } else {
      setHelperText("Incorrect password");
    }
  };
  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {focusedKey === undefined && !newKey ? (
        <Box>
          <Typography>Choose a key for authorization</Typography>
          <List sx={{ overflow: "auto", maxHeight: "300px" }}>
            {auths.map((auth: Auth, index: number) => (
              <ListItem id={"" + index}>
                <Box
                  sx={keyStyle}
                  onClick={() => {
                    setFocusedKey(auth.authHi);
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: "bold",
                    }}
                  >
                    Key {" " + auth.authHi.toString()}
                  </Typography>
                  {activeAuth.authHi === auth.authHi && <Check />}
                </Box>
              </ListItem>
            ))}
          </List>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              pb: 2,
              pt: 0.2,
              width: "100%",
            }}
          >
            <Button
              variant="contained"
              fullWidth
              onClick={() => setNewKey(true)}
            >
              Create new key
            </Button>
          </Box>
        </Box>
      ) : newKey ? (
        <Box>
          <Password
            setPassword={setPassword}
            helperText={helperText}
            password={password}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              mt: 1,
            }}
          >
            <Button
              // @ts-ignore
              variant="textSecondary"
              fullWidth
              sx={{
                mr: 1,
              }}
              onClick={() => {
                setNewKey(false);
                setHelperText(undefined);
                setPassword("");
              }}
            >
              Back
            </Button>
            <LoadingButton
              loading={loading}
              disabled={loading}
              variant="contained"
              fullWidth
              sx={{
                ml: 1,
              }}
              onClick={handleAddKey}
            >
              Generate
            </LoadingButton>
          </Box>
        </Box>
      ) : (
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              my: 2,
            }}
          >
            <Typography
              sx={{
                fontWeight: "bold",
              }}
            >
              Key {" " + focusedKey?.toString()}
            </Typography>
            <Typography>
              {focusedKey === activeAuth.authHi ? "active" : "inactive"}
            </Typography>
          </Box>
          <Password
            setPassword={setPassword}
            helperText={helperText}
            password={password}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              mt: 1,
            }}
          >
            {
              <Button
                // @ts-ignore
                variant="textSecondary"
                fullWidth
                onClick={() => {
                  setFocusedKey(undefined);
                  setHelperText(undefined);
                  setPassword("");
                }}
              >
                Back
              </Button>
            }
            {focusedKey !== activeAuth.authHi && (
              <Button
                variant="contained"
                fullWidth
                sx={{
                  mx: 1,
                }}
                onClick={handleActivateKey}
              >
                Activate
              </Button>
            )}
            {
              <LoadingButton
                loading={loading}
                disabled={loading}
                // @ts-ignore
                variant="containedSecondary"
                fullWidth
                onClick={handleDeleteKey}
              >
                Delete
              </LoadingButton>
            }
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default KeysManagement;
