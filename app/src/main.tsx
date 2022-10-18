import React from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { render } from "preact";
import { QueryClient, QueryClientProvider } from "react-query";
import { App } from "./app";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
    },
  }
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />
  }
]);

const theme = createTheme({
  palette: {
    primary: {
      main: "#3A7A10" //brandGreen
    }
  }
});

const AppWrapper = () => {
  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
};

render(<AppWrapper />, document.getElementById("app") as HTMLElement);
