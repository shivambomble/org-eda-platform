import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setToken } from "../lib/auth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Package, TrendingUp, BarChart3, Zap } from "lucide-react";

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const onSubmit = async (data: any) => {
    setLoading(true);
    setApiError("");
    try {
      const res = await axios.post(`${API_URL}/auth/login`, data);
      setToken(res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/");
    } catch (err: any) {
        console.error(err);
      setApiError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Package, label: "Smart Inventory", color: "text-blue-400" },
    { icon: TrendingUp, label: "Real-time Analytics", color: "text-emerald-400" },
    { icon: BarChart3, label: "Data Insights", color: "text-purple-400" },
    { icon: Zap, label: "Fast Processing", color: "text-yellow-400" },
  ];

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Animated Background Banners */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top Banner - Inventory Management */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-blue-600/15 via-blue-500/20 to-blue-600/15 border-b border-blue-500/30 flex items-center">
          <div className="flex items-center h-full animate-continuous-scroll">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-12 whitespace-nowrap">
                <Package className="w-8 h-8 text-blue-400 animate-pulse" />
                <span className="text-2xl font-bold text-blue-300">Inventory Management</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Banner - Real Time Analytics */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-r from-emerald-600/15 via-emerald-500/20 to-emerald-600/15 border-t border-emerald-500/30 flex items-center">
          <div className="flex items-center h-full animate-continuous-scroll-reverse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-12 whitespace-nowrap">
                <TrendingUp className="w-8 h-8 text-emerald-400 animate-pulse" />
                <span className="text-2xl font-bold text-emerald-300">Real-time Analytics</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Feature Icons */}
        <div className="absolute top-1/4 left-10 animate-float">
          <BarChart3 className="w-16 h-16 text-purple-400/20" />
        </div>
        <div className="absolute top-1/3 right-10 animate-float" style={{ animationDelay: '1s' }}>
          <Zap className="w-16 h-16 text-yellow-400/20" />
        </div>
        <div className="absolute bottom-1/4 left-1/4 animate-float" style={{ animationDelay: '2s' }}>
          <Package className="w-16 h-16 text-blue-400/20" />
        </div>
        <div className="absolute bottom-1/3 right-1/4 animate-float" style={{ animationDelay: '1.5s' }}>
          <TrendingUp className="w-16 h-16 text-emerald-400/20" />
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md relative z-10 animate-fadeIn">
        <Card className="p-8 glass border-slate-700 shadow-2xl animate-scaleIn">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🔐 OrgEDA</h1>
            <p className="text-slate-400">Inventory Management Platform</p>
          </div>

          {/* Feature Pills */}
          <div className="grid grid-cols-2 gap-2 mb-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:border-slate-500 transition-all hover:bg-slate-700/50 animate-slideInUp"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <feature.icon className={`w-4 h-4 ${feature.color}`} />
                <span className="text-xs text-slate-300 font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="animate-slideInLeft">
              <Input
                label="Email"
                type="email"
                {...register("email", { required: "Email is required" })}
                error={errors.email?.message as string}
              />
            </div>
            
            <div className="animate-slideInLeft" style={{ animationDelay: '0.1s' }}>
              <Input
                label="Password"
                type="password"
                {...register("password", { required: "Password is required" })}
                error={errors.password?.message as string}
              />
            </div>
            
            {apiError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm text-center animate-slideInRight">
                {apiError}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 btn-hover" 
              isLoading={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-center text-slate-400 text-sm mb-4 font-semibold">Demo Credentials</p>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="bg-slate-700/30 p-3 rounded-lg hover:bg-slate-700/50 transition-colors">
                <p className="font-semibold text-slate-300">Admin</p>
                <p>admin@acme.com / password</p>
              </div>
              <div className="bg-slate-700/30 p-3 rounded-lg hover:bg-slate-700/50 transition-colors">
                <p className="font-semibold text-slate-300">Analyst</p>
                <p>analyst@acme.com / password</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes continuous-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes continuous-scroll-reverse {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(50%);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-30px) rotate(10deg);
            opacity: 0.4;
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-continuous-scroll {
          animation: continuous-scroll 30s linear infinite;
        }

        .animate-continuous-scroll-reverse {
          animation: continuous-scroll-reverse 30s linear infinite;
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-slideInUp {
          animation: slideInUp 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default Login;
