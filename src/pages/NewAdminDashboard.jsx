import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const NewAdminDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold">Selamat Datang, Admin!</h1>
        <p className="mt-2 text-gray-600">
          Anda berhasil login sebagai <span className="font-semibold">{user?.email}</span>.
        </p>
        <p className="mt-1 text-gray-600">
          Aplikasi baru Anda siap untuk dikembangkan dari sini.
        </p>
        <Button onClick={logout} className="mt-6">
          Logout
        </Button>
      </div>
    </div>
  );
};

export default NewAdminDashboard;