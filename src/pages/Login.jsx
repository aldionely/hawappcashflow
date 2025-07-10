import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const loginResult = await login(username, password);

    if (loginResult.success) {
      if (loginResult.role === "admin") {
        navigate("/dashboard");
        toast({
          title: "Login berhasil",
          description: "Selamat datang di panel admin",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Login gagal",
        description: loginResult.error || "Username atau password salah",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-xl p-8 shadow-strong-pekat border-2 border-black"
      >
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Haw Reload
        </h1>
        <form onSubmit={handleLogin} className="space-y-8">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-1 py-2 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-cyan-500 transition-colors"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-1 py-2 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-cyan-500 transition-colors"
              required
              disabled={isLoading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-cyan-400 text-white font-bold hover:bg-cyan-500 rounded-lg border-2 border-black active:shadow-none"
            style={{ boxShadow: '5px 5px 0px 0px rgba(0,0,0,1)' }}
            disabled={isLoading}
          >
            {isLoading ? "Memproses..." : "Login"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;