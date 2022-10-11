import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { render } from "preact";
import { QueryClient, QueryClientProvider } from "react-query";
import { App } from "./app";
import "./index.css";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  }
]);

const AppWrapper = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>
  );
};

render(<AppWrapper />, document.getElementById("app") as HTMLElement);
