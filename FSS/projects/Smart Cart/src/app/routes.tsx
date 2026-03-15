import { createBrowserRouter, useNavigate } from "react-router";
import { useEffect } from "react";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Cart } from "./pages/Cart";
import { Orders } from "./pages/Orders";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOrders from "./pages/AdminOrders";
import ManagerDashboard from "./pages/ManagerDashboard";
import { AdminSettings } from "./pages/AdminSettings";
import { AdminCatalog } from "./pages/AdminCatalog";
import { AdminPages } from "./pages/AdminPages";
import Logout from "./pages/Logout";

import { Catalog } from "./pages/Catalog";
import { AddFromShare } from "./pages/AddFromShare";
import { CustomPage } from "./pages/CustomPage";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        Component: Home,
      },
      {
        path: "catalog",
        Component: Catalog,
      },
      {
        path: "cart",
        Component: Cart,
      },
      {
        path: "orders",
        Component: Orders,
      },
      {
        path: "login",
        Component: Login,
      },
      {
        path: "signup",
        Component: Signup,
      },
      {
        path: "logout",
        Component: Logout,
      },
      {
        path: "admin",
        Component: AdminDashboard,
      },
      {
        path: "admin/orders",
        Component: AdminOrders,
      },
      {
        path: "admin/settings",
        Component: AdminSettings,
      },
      {
        path: "admin/catalog",
        Component: AdminCatalog,
      },
      {
        path: "admin/pages",
        Component: AdminPages,
      },
      {
        path: "add-from-share",
        Component: AddFromShare,
      },
      {
        path: "manager",
        Component: ManagerDashboard,
      },
      {
        path: "p/:slug",
        Component: CustomPage,
      },
      {
        path: "privacy",
        Component: PrivacyPolicy,
      },
      {
        path: "*",
        Component: () => {
          const navigate = useNavigate();
          useEffect(() => {
            navigate('/');
          }, [navigate]);
          return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
        },
      },
    ],
  },
]);