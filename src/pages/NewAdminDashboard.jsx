import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut } from 'lucide-react';

// Impor komponen tab yang baru dibuat
import KeuanganUmumTab from '@/components/dashboard/KeuanganUmumTab';
import GajiShiftTab from '@/components/dashboard/GajiShiftTab';
import SaldoTab from '@/components/dashboard/SaldoTab';
import ArusSaldoTab from '@/components/dashboard/ArusSaldoTab';

const NewAdminDashboard = () => {
    const { logout } = useAuth();
    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
          <header className="flex items-center justify-between p-4 bg-white shadow-md">
            <h1 className="text-xl font-bold">Haw Reload</h1>
            <Button onClick={logout} variant="outline" size="sm">
                <span className="hidden sm:inline">Logout</span>
                <LogOut className="sm:hidden h-4 w-4"/>
            </Button>
          </header>
          <main className="flex-1 p-2 sm:p-4 md:p-6">
            <div className="w-full max-w-7xl mx-auto space-y-4">
                <Tabs defaultValue="arus-saldo" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="keuangan-umum" className="text-xs sm:text-sm">Catatan Uang</TabsTrigger>
                        <TabsTrigger value="gaji-shift" className="text-xs sm:text-sm">Catatan Shift</TabsTrigger>
                        <TabsTrigger value="catatan-saldo" className="text-xs sm:text-sm">Catatan Saldo</TabsTrigger>
                        <TabsTrigger value="arus-saldo" className="text-xs sm:text-sm">Arus Saldo</TabsTrigger>
                    </TabsList>
                    <TabsContent value="keuangan-umum" className="mt-4"><KeuanganUmumTab /></TabsContent>
                    <TabsContent value="gaji-shift" className="mt-4"><GajiShiftTab /></TabsContent>
                    <TabsContent value="catatan-saldo" className="mt-4"><SaldoTab /></TabsContent>
                    <TabsContent value="arus-saldo" className="mt-4"><ArusSaldoTab /></TabsContent>
                </Tabs>
            </div>
          </main>
        </div>
      );
};

export default NewAdminDashboard;