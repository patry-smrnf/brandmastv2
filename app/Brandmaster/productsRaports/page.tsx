"use client";
import AuthGuard from "../../AuthGuard";
import ProductsPage from "./productsRaports";

export default function BMDashboard() {
  return (
  <AuthGuard allowedRoles={["BM"]}>
    <ProductsPage/>
  </AuthGuard>  
  );
  
}
