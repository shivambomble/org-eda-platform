import { LogOut } from "lucide-react";
import { logout } from "../../lib/auth";
import { Button } from "../ui/Button";

const Navbar = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700 px-6 shadow-xl animate-slideInLeft z-50">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-lg hover:shadow-blue-500/50 transition-all hover:scale-110">
          OE
        </div>
        <span className="text-2xl font-bold text-white">OrgEDA</span>
      </div>
      <Button 
        variant="ghost" 
        onClick={logout} 
        className="text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </header>
  );
};

export default Navbar;
