import React from "react";
import { render } from "preact";
import { QueryClient, QueryClientProvider } from "react-query";
import { App } from "./app";
import "./index.css";

const queryClient = new QueryClient();

const AppWrapper = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
};

render(<AppWrapper />, document.getElementById("app") as HTMLElement);
