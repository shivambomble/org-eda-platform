import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 font-sans pt-16">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
