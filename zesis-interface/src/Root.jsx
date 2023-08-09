import Theme from "./Theme";
import App from "./App";
import { IdentityWalletProvider } from "./context/identity-wallet-context";
import { SnackbarProvider } from "notistack";
import { DeviceContextProvider } from "./context/deviceContext";
import { IssuerContextProvider } from "./context/issuerContext";
import { VerifierContextProvider } from "./context/verifierContext";
import { DemoLayer } from "./components/DemoLayer";
import { Web3Provider } from "./context/web3-context";

const Root = () => {
  return (
    <Theme>
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={1500}
        anchorOrigin={{
          horizontal: "center",
          vertical: "top",
        }}
      >
        <DemoLayer />
        <Web3Provider>
          <IdentityWalletProvider>
            <DeviceContextProvider>
              <IssuerContextProvider>
                <VerifierContextProvider>
                  <App />
                </VerifierContextProvider>
              </IssuerContextProvider>
            </DeviceContextProvider>
          </IdentityWalletProvider>
        </Web3Provider>
      </SnackbarProvider>
    </Theme>
  );
};
export default Root;
