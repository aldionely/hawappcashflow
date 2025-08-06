import React, { useState, useMemo, Fragment, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumberInput, parseFormattedNumber, formatDateTime } from '@/lib/utils';
import { PlusCircle, Trash2, ArrowDownCircle, DollarSign, ChevronDown, LogOut, Download, Briefcase, Edit } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Komponen PDF untuk Keuangan Umum (Disederhanakan)
const KeuanganUmumPDFReport = ({ groupedTransactions, stats, filterInfo }) => (
    <div className="p-8 bg-white" style={{ width: '800px' }}>
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Laporan Keuangan</h1>
            <p className="text-gray-500">{filterInfo}</p>
        </div>
        <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Ringkasan Statistik</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-green-100 p-4 rounded-lg"><p className="text-muted-foreground">Total Pemasukan</p><p className="font-bold text-lg text-green-700">Rp {stats.totalUangMasuk.toLocaleString('id-ID')}</p></div>
                <div className="bg-red-100 p-4 rounded-lg"><p className="text-muted-foreground">Total Pengeluaran</p><p className="font-bold text-lg text-red-700">- Rp {Math.abs(stats.totalUangKeluar).toLocaleString('id-ID')}</p></div>
                <div className="bg-blue-100 p-4 rounded-lg"><p className="text-muted-foreground">Total Akhir</p><p className="font-bold text-lg text-blue-700">Rp {stats.totalSemua.toLocaleString('id-ID')}</p></div>
            </div>
        </div>
        <div>
            <h2 className="text-xl font-semibold mb-4">Rincian</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Tanggal</th>
                  <th className="text-left p-2">Keterangan</th>
                  <th className="text-right p-2">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {groupedTransactions.map(group => {
                  const { date } = formatDateTime(group.created_at);
                  const isExpense = group.total < 0;
                  const groupTitle = isExpense ? (group.item_taken || "Uang Keluar") : `${group.lokasi || 'Tanpa Lokasi'} - ${group.shift_name || 'Tanpa Shift'}`;
                  return (
                    <tr key={group.group_id} className="border-b">
                      <td className="p-2">{date}</td>
                      <td className="p-2">{groupTitle}</td>
                      <td className={`p-2 text-right font-semibold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                        {isExpense ? '-' : '+'} Rp {Math.abs(group.total).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
    </div>
);


const GajiShiftReport = ({ salaryData }) => (
    <>
      {salaryData.map((data) => (
        <div key={data.id} className="p-6 border rounded-lg shadow-md salary-report-item bg-white" data-id={data.id} style={{ width: '780px', fontFamily: 'sans-serif' }}>
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">{data.shift_name} - {data.lokasi}</h2>
            <div className="mt-2 mb-4">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">Rincian Gaji {data.shift_name}</h3>
                <div className="text-xs space-y-2 text-gray-600 border p-3 rounded-md bg-gray-50">
                    <div className="flex justify-between items-center">
                        <span>Terhitung ({data.hariKerja} hari kerja × Rp {data.daily_wage.toLocaleString('id-ID')})</span>
                        <span className="font-medium">Rp {(data.hariKerja * data.daily_wage).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Total Kasbon</span>
                        <span className="font-medium text-red-600">- Rp {data.totalKasbon.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center border-t mt-2 pt-2">
                        <span className="font-bold">Total Diterima</span>
                        <span className="font-bold text-blue-700">Rp {data.gajiAkhir.toLocaleString('id-ID')}</span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6 pt-4 border-t mt-4">
                <div>
                    <h4 className="font-semibold text-gray-700 mb-2 text-sm">Rincian Kasbon</h4>
                    {data.activities.filter(a => a.type === 'kasbon').length > 0 ? (
                       <ul className="space-y-1 text-xs text-gray-600">
                           {data.activities.filter(a => a.type === 'kasbon').map(a => (
                               <li key={a.id} className="flex justify-between items-center p-1.5 bg-gray-50 rounded">
                                   <span>{formatDateTime(a.activity_date).date}{a.notes ? ` (${a.notes})` : ''}</span>
                                   <span className="font-semibold text-red-500">-Rp {a.amount.toLocaleString('id-ID')}</span>
                               </li>
                           ))}
                       </ul>
                    ) : <p className="text-xs text-gray-400">Tidak ada data.</p>}
                </div>
                <div>
                    <h4 className="font-semibold text-gray-700 mb-2 text-sm">Rincian Libur ({data.totalLibur} hari)</h4>
                    {data.activities.filter(a => a.type === 'libur').length > 0 ? (
                        <ul className="space-y-1 text-xs text-gray-600">
                            {data.activities.filter(a => a.type === 'libur').map(a => (
                                <li key={a.id} className="flex items-center p-1.5 bg-gray-50 rounded">
                                    {formatDateTime(a.activity_date).date}{a.notes ? ` (${a.notes})` : ''}
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-xs text-gray-400">Tidak ada data.</p>}
                </div>
            </div>
        </div>
      ))}
    </>
);

const ShiftActivityPDFReport = ({ salaryData, filterMonth }) => {
    const activitiesByDate = useMemo(() => {
        const grouped = {};
        salaryData.forEach(shift => {
            shift.activities.forEach(activity => {
                const date = activity.activity_date.slice(0, 10);
                if (!grouped[date]) {
                    grouped[date] = [];
                }
                grouped[date].push({
                    ...activity,
                    shift_name: shift.shift_name,
                    lokasi: shift.lokasi,
                });
            });
        });
        return Object.keys(grouped).sort().reduce((obj, key) => {
            obj[key] = grouped[key];
            return obj;
        }, {});
    }, [salaryData]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="p-8 bg-white" style={{ width: '800px', fontFamily: 'sans-serif' }}>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold">Laporan Aktivitas Shift</h1>
                <p className="text-gray-500">Bulan: {filterMonth}</p>
            </div>
            <div className="space-y-6">
                {Object.entries(activitiesByDate).map(([date, activities]) => {
                    const dailyTotalKasbon = activities
                        .filter(a => a.type === 'kasbon')
                        .reduce((sum, a) => sum + (a.amount || 0), 0);

                    return (
                        <div key={date}>
                            <h2 className="text-lg font-semibold mb-2">{formatDate(date)}</h2>
                            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#374151', color: 'white' }}>
                                        <th className="text-left p-2">Nama Shift</th>
                                        <th className="text-left p-2">Lokasi</th>
                                        <th className="text-left p-2">Tipe</th>
                                        <th className="text-left p-2">Keterangan</th>
                                        <th className="text-right p-2">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activities.map((activity, index) => {
                                        const rowStyle = index % 2 === 0 ? { backgroundColor: '#f9fafb' } : { backgroundColor: '#ffffff' };
                                        return (
                                            <tr key={activity.id} style={rowStyle}>
                                                <td className="p-2 border-b">{activity.shift_name}</td>
                                                <td className="p-2 border-b">{activity.lokasi}</td>
                                                <td className="p-2 border-b capitalize">{activity.type}</td>
                                                <td className="p-2 border-b">{activity.notes || '-'}</td>
                                                <td className="p-2 border-b text-right font-medium">
                                                    {activity.type === 'kasbon' ? `Rp ${activity.amount.toLocaleString('id-ID')}` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ backgroundColor: '#e5e7eb', fontWeight: 'bold' }}>
                                        <td colSpan="4" className="p-2 text-right">TOTAL KASBON HARIAN</td>
                                        <td className="p-2 text-right">Rp {dailyTotalKasbon.toLocaleString('id-ID')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

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
                <Tabs defaultValue="keuangan-umum" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="keuangan-umum" className="text-xs sm:text-sm">Catatan Uang</TabsTrigger>
                        <TabsTrigger value="gaji-shift" className="text-xs sm:text-sm">Catatan Shift</TabsTrigger>
                        <TabsTrigger value="catatan-saldo" className="text-xs sm:text-sm">Catatan Saldo</TabsTrigger>
                    </TabsList>
                    <TabsContent value="keuangan-umum" className="mt-4"><KeuanganUmumTab /></TabsContent>
                    <TabsContent value="gaji-shift" className="mt-4"><GajiShiftTab /></TabsContent>
                    <TabsContent value="catatan-saldo" className="mt-4"><SaldoTab /></TabsContent>
                </Tabs>
            </div>
          </main>
        </div>
      );
};

const SaldoTab = () => {
    const { saldoActivities, addSaldoActivity, updateSaldoActivity, deleteSaldoActivity, loading } = useData();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formState, setFormState] = useState({ datetime: new Date().toISOString().slice(0, 16) });
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [filterLocation, setFilterLocation] = useState('Semua');
    const [isDownloading, setIsDownloading] = useState(false);

    // State for editing
    const [editingSaldo, setEditingSaldo] = useState(null);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);

    const handleInputChange = (e, field) => {
        setFormState(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleNominalChange = (e) => {
        setFormState(prev => ({ ...prev, nominal: formatNumberInput(e.target.value) }));
    };

    const resetForm = () => setFormState({ datetime: new Date().toISOString().slice(0, 16) });
    const handleFormOpenChange = (open) => { if (!open) resetForm(); setIsFormOpen(open); };
    
    // Handlers for edit dialog
    const handleEditFormOpen = (saldo) => {
        setEditingSaldo(saldo);
        setFormState({
            datetime: saldo.created_at.slice(0, 16),
            lokasi: saldo.lokasi,
            aplikasi: saldo.aplikasi,
            nominal: formatNumberInput(String(saldo.nominal)),
        });
        setIsEditFormOpen(true);
    };
    
    const handleEditFormClose = () => {
        setIsEditFormOpen(false);
        setEditingSaldo(null);
        resetForm();
    };


    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const dataToSubmit = {
            created_at: new Date(formState.datetime).toISOString(),
            lokasi: formState.lokasi,
            aplikasi: formState.aplikasi,
            nominal: parseInt(parseFormattedNumber(formState.nominal || '0'), 10),
        };

        const result = await addSaldoActivity(dataToSubmit);

        if (result.success) {
            toast({ title: "Sukses", description: "Catatan saldo berhasil ditambahkan." });
            handleFormOpenChange(false);
            setFilterMonth(formState.datetime.slice(0, 7));
        } else {
            toast({ variant: "destructive", title: "Gagal", description: result.error.message });
        }
    };

    const handleEditFormSubmit = async (e) => {
        e.preventDefault();
        if (!editingSaldo) return;

        const dataToSubmit = {
            created_at: new Date(formState.datetime).toISOString(),
            lokasi: formState.lokasi,
            aplikasi: formState.aplikasi,
            nominal: parseInt(parseFormattedNumber(formState.nominal || '0'), 10),
        };

        const result = await updateSaldoActivity(editingSaldo.id, dataToSubmit);

        if (result.success) {
            toast({ title: "Sukses", description: "Catatan saldo berhasil diperbarui." });
            handleEditFormClose();
        } else {
            toast({ variant: "destructive", title: "Gagal", description: result.error.message });
        }
    };

    const handleDeleteConfirm = async (id) => {
        const result = await deleteSaldoActivity(id);
        if (result.success) {
            toast({ title: "Sukses", description: "Catatan saldo berhasil dihapus." });
        } else {
            toast({ variant: "destructive", title: "Gagal", description: result.error.message });
        }
    };


    const filteredSaldo = useMemo(() => {
        // Hapus .sort() karena data sudah diurutkan dari server
        return saldoActivities.filter(item => {
            const itemMonth = item.created_at.slice(0, 7);
            const monthMatch = itemMonth === filterMonth;
            const locationMatch = filterLocation === 'Semua' || item.lokasi === filterLocation;
            return monthMatch && locationMatch;
        });
    }, [saldoActivities, filterMonth, filterLocation]);

    const handleDownloadPDF = () => {
        if (filteredSaldo.length === 0) {
            toast({ variant: "destructive", title: "Tidak ada data untuk diunduh." });
            return;
        }
        setIsDownloading(true);
    
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
    
        // Tambah Judul
        doc.setFontSize(18);
        doc.text("Rincian Saldo Flip", pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(15);
        doc.text(`${filterLocation}`, pageWidth / 2, 28, { align: 'center' });
    
        const sortedData = [...filteredSaldo].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        const tableBody = [];
        let lastDate = null;
    
        sortedData.forEach(item => {
            const { date, time } = formatDateTime(item.created_at);
    
            if (lastDate !== null && date !== lastDate) {
                // Tambahkan baris pemisah kosong
                tableBody.push([{ content: '', colSpan: 6, styles: { fillColor: '#fff', minCellHeight: 5 } }]);
            }
    
            tableBody.push([
                date,
                time,
                item.lokasi,
                item.aplikasi,
                `Rp ${item.nominal.toLocaleString('id-ID')}`,
                '' // Kolom status kosong
            ]);
    
            lastDate = date;
        });
    
        autoTable(doc, {
            startY: 40,
            head: [['TANGGAL', 'JAM', 'LOKASI', 'APLIKASI', 'NOMINAL', 'STATUS']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [255, 255, 255], // Latar belakang header putih
                textColor: [0, 0, 0],       // Teks header hitam
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                lineColor: [20, 20, 20], 
                lineWidth: 0.1,
            },
            styles: {
                valign: 'middle', // Posisi vertikal tengah untuk semua sel
                lineColor: [20, 20, 20],
                lineWidth: 0.1,
            },
            columnStyles: {
                0: { halign: 'center' }, // Tanggal
                1: { halign: 'center' }, // Jam
                2: { halign: 'center' }, // Lokasi
                3: { halign: 'left' },   // Aplikasi
                4: { halign: 'center' }, // Nominal
                5: { halign: 'center' }, // Status
            },
            didParseCell: function (data) {
                // Menghilangkan border untuk baris pemisah
                if (data.row.raw?.[0]?.colSpan === 6) {
                    data.cell.styles.lineColor = [20, 20, 20];
                }
            }
        });
    
        doc.save(`laporan-saldo-${filterMonth}-${filterLocation}.pdf`);
        setIsDownloading(false);
    };
    
    return (
        <div className="space-y-4">
            <section>
                <Card className="shadow-strong-pekat border-2 border-black">
                    <CardHeader className="flex-row items-center justify-between p-4">
                        <CardTitle className="text-sm">Filter Data</CardTitle>
                        <Button onClick={handleDownloadPDF} disabled={isDownloading} size="sm" className="shadow-button-pekat border-black border-2 active:shadow-none text-xs">
                            <Download className="mr-2 h-4 w-4"/>
                            {isDownloading ? 'Mengunduh...' : 'Unduh'}
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                        <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
                        <Select onValueChange={setFilterLocation} defaultValue="Semua">
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Pilih Lokasi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Semua">Semua Lokasi</SelectItem>
                                <SelectItem value="PIPITAN">PIPITAN</SelectItem>
                                <SelectItem value="SADIK">SADIK</SelectItem>
                                <SelectItem value="HAW">HAW</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            </section>
            
            <section>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold">Aktivitas Saldo</h2>
                    <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setIsFormOpen(true)} size="sm" className="shadow-button-pekat border-2 border-black active:shadow-none text-xs">
                                <PlusCircle className="mr-1 h-4 w-4"/> Tambah Saldo
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Tambah Catatan Saldo</DialogTitle>
                            </DialogHeader>
                            <form id="saldo-form" className="space-y-4" onSubmit={handleFormSubmit}>
                                <div>
                                    <label className="text-sm font-medium">Tanggal & Jam</label>
                                    <Input type="datetime-local" value={formState.datetime || ''} onChange={(e) => handleInputChange(e, 'datetime')} required/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Lokasi</label>
                                     <Select onValueChange={(value) => setFormState(p => ({...p, lokasi: value}))} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Lokasi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PIPITAN">PIPITAN</SelectItem>
                                            <SelectItem value="SADIK">SADIK</SelectItem>
                                            <SelectItem value="HAW">HAW</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Aplikasi</label>
                                    <Input placeholder="Nama Aplikasi" value={formState.aplikasi || ''} onChange={(e) => handleInputChange(e, 'aplikasi')} required/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Nominal</label>
                                    <Input placeholder="Jumlah Nominal" value={formState.nominal || ''} onChange={handleNominalChange} required/>
                                </div>
                            </form>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => handleFormOpenChange(false)}>Batal</Button>
                                <Button type="submit" form="saldo-form">Simpan</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <Card>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Jam</TableHead>
                                    <TableHead>Lokasi</TableHead>
                                    <TableHead>Aplikasi</TableHead>
                                    <TableHead className="text-right">Nominal</TableHead>
                                    <TableHead className="text-right">Opsi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan="6" className="text-center">Memuat data...</TableCell>
                                    </TableRow>
                                ) : filteredSaldo.length > 0 ? (
                                    filteredSaldo.map(item => {
                                        const { date, time } = formatDateTime(item.created_at);
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>{date}</TableCell>
                                                <TableCell>{time}</TableCell>
                                                <TableCell>{item.lokasi}</TableCell>
                                                <TableCell>{item.aplikasi}</TableCell>
                                                <TableCell className="text-right font-semibold">Rp {item.nominal.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditFormOpen(item)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                    <Trash2 className="h-4 w-4 text-red-600"/>
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Yakin hapus catatan ini?</AlertDialogTitle>
                                                                    <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteConfirm(item.id)}>Hapus</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan="6" className="text-center">Belum ada data saldo.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </section>
            
            <Dialog open={isEditFormOpen} onOpenChange={handleEditFormClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Catatan Saldo</DialogTitle>
                    </DialogHeader>
                    <form id="edit-saldo-form" className="space-y-4" onSubmit={handleEditFormSubmit}>
                        <div>
                            <label className="text-sm font-medium">Tanggal & Jam</label>
                            <Input type="datetime-local" value={formState.datetime || ''} onChange={(e) => handleInputChange(e, 'datetime')} required/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Lokasi</label>
                             <Select value={formState.lokasi} onValueChange={(value) => setFormState(p => ({...p, lokasi: value}))} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Lokasi" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PIPITAN">PIPITAN</SelectItem>
                                    <SelectItem value="SADIK">SADIK</SelectItem>
                                    <SelectItem value="HAW">HAW</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Aplikasi</label>
                            <Input placeholder="Nama Aplikasi" value={formState.aplikasi || ''} onChange={(e) => handleInputChange(e, 'aplikasi')} required/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Nominal</label>
                            <Input placeholder="Jumlah Nominal" value={formState.nominal || ''} onChange={handleNominalChange} required/>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleEditFormClose}>Batal</Button>
                        <Button type="submit" form="edit-saldo-form">Simpan Perubahan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};


const KeuanganUmumTab = () => {
    const { transactions, loading, addTransactions, deleteTransactionGroup } = useData();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [formState, setFormState] = useState({});
    const [expenseFormState, setExpenseFormState] = useState({});
    const [filterMode, setFilterMode] = useState('monthly');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const reportRef = useRef();
    const [isDownloading, setIsDownloading] = useState(false);
    const moneyCategories = {'Ratusan': 'uang_ratusan','Puluhan': 'uang_puluhan','2 Ribuan': 'uang_2ribuan','Koin': 'uang_koin','Aksesoris': 'uang_aksesoris','On Mobile': 'uang_onmobile',};
    const handleInputChange = (e, field) => setFormState(prev => ({ ...prev, [field]: formatNumberInput(e.target.value) }));
    const handleExpenseInputChange = (e, field) => setExpenseFormState(prev => ({...prev, [field]: field === 'amount' ? formatNumberInput(e.target.value) : e.target.value }));
    const resetForm = () => setFormState({});
    const resetExpenseForm = () => setExpenseFormState({});
    const handleFormOpenChange = (open) => { if (!open) resetForm(); setIsFormOpen(open); };
    const handleExpenseFormOpenChange = (open) => { if (!open) resetExpenseForm(); setIsExpenseFormOpen(open); };

    const handleDeleteGroup = async (groupId) => {
        await deleteTransactionGroup(groupId);
        toast({ title: "Sukses", description: "Grup aktivitas berhasil dihapus." });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const groupId = crypto.randomUUID();
        const commonData = { group_id: groupId, shift_date: formState.shift_date || new Date().toISOString().split('T')[0], shift_name: formState.shift_name, lokasi: formState.lokasi, notes: formState.keterangan };
        const newTransactions = Object.entries(moneyCategories).map(([category, fieldName]) => ({ ...commonData, category, amount: parseInt(parseFormattedNumber(formState[fieldName] || '0'), 10) })).filter(t => t.amount > 0);
        if (newTransactions.length === 0) return toast({ variant: "destructive", title: "Gagal", description: "Tidak ada jumlah uang yang diisi." });
        const result = await addTransactions(newTransactions);
        if (result.success) {
            toast({ title: "Sukses", description: `Catatan berhasil ditambahkan.` });
            handleFormOpenChange(false);
        } else {
            toast({ variant: "destructive", title: "Gagal", description: result.error.message });
        }
    };
    
    const handleExpenseFormSubmit = async (e) => {
        e.preventDefault();
        const groupId = crypto.randomUUID();
        const commonData = { group_id: groupId, shift_date: new Date().toISOString().split('T')[0], person_name: expenseFormState.person_name, notes: expenseFormState.notes };
        let transactionsToSubmit = [];
        if (expenseFormState.ambil_semua) {
            transactionsToSubmit = Object.entries(stats.kategori).filter(([, total]) => total > 0).map(([category, total]) => ({ ...commonData, category, amount: -total, item_taken: 'Semua Uang' }));
        } else {
            const amount = parseInt(parseFormattedNumber(expenseFormState.amount || '0'), 10);
            const category = expenseFormState.category || 'Lainnya';
            transactionsToSubmit.push({ ...commonData, category, amount: -amount, item_taken: expenseFormState.item_taken || `${category} diambil` });
        }
        if(transactionsToSubmit.length === 0) return toast({ variant: "destructive", title: "Gagal", description: "Tidak ada uang untuk ditarik." });
        const result = await addTransactions(transactionsToSubmit);
        if(result.success) {
            toast({ title: "Sukses", description: "Catatan pengeluaran berhasil ditambahkan." });
            handleExpenseFormOpenChange(false);
        } else {
             toast({ variant: "destructive", title: "Gagal", description: result.error?.message || "Gagal menyimpan data." });
        }
    };
    
    const filteredTransactions = useMemo(() => {
        if (filterMode === 'daily') return transactions.filter(t => t.shift_date === selectedDate);
        if (filterMode === 'monthly') return transactions.filter(t => t.shift_date.startsWith(selectedMonth));
        return transactions;
    }, [transactions, filterMode, selectedDate, selectedMonth]);
    
    const stats = useMemo(() => {
        const result = { kategori: {}, totalPerLokasi: {}, totalSemua: 0, totalUangMasuk: 0, totalUangKeluar: 0 };
        filteredTransactions.forEach(t => {
            result.kategori[t.category] = (result.kategori[t.category] || 0) + t.amount;
            if (t.lokasi) result.totalPerLokasi[t.lokasi] = (result.totalPerLokasi[t.lokasi] || 0) + t.amount;
            if (t.amount > 0) result.totalUangMasuk += t.amount; else result.totalUangKeluar += t.amount;
        });
        result.totalSemua = result.totalUangMasuk + result.totalUangKeluar;
        return result;
    }, [filteredTransactions]);
    
    const groupedTransactions = useMemo(() => {
        const groups = {};
        filteredTransactions.forEach(t => {
            if (!groups[t.group_id]) groups[t.group_id] = { ...t, total: 0, details: [] };
            groups[t.group_id].total += t.amount;
            groups[t.group_id].details.push(t);
        });
        return Object.values(groups).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    }, [filteredTransactions]);

    const handleDownloadPDF = async () => {
        if (filteredTransactions.length === 0) return toast({ variant: "destructive", title: "Tidak ada data untuk diunduh." });
        setIsDownloading(true);
        const reportElement = reportRef.current;
        const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const totalPDFHeight = (canvasHeight * pdfWidth) / canvasWidth;

        let heightLeft = totalPDFHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPDFHeight);
        heightLeft -= pdfPageHeight;

        while (heightLeft > 0) {
            position -= pdfPageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPDFHeight);
            heightLeft -= pdfPageHeight;
        }
        
        pdf.save(`laporan-umum-${filterMode === 'daily' ? selectedDate : selectedMonth}.pdf`);
        setIsDownloading(false);
    };

    const getFilterInfo = () => {
        if (filterMode === 'daily') return `Laporan Harian: ${selectedDate}`;
        if (filterMode === 'monthly') return `Laporan Bulanan: ${selectedMonth}`;
        return 'Laporan Semua Aktivitas';
    };

    const StatCard = ({ title, value, icon }) => ( <Card className="shadow-strong-pekat border-2 border-black"><CardHeader className="flex flex-row items-center justify-between space-y-0 p-3"><CardTitle className="text-xs font-medium">{title}</CardTitle>{icon}</CardHeader><CardContent className="p-3 pt-0"><div className="text-lg font-bold">Rp {Number(value).toLocaleString('id-ID')}</div></CardContent></Card> );

    return (
        <div className="space-y-4">
            <div style={{ position: 'absolute', left: '-9999px', zIndex: -1 }}>
                <div ref={reportRef}>
                    <KeuanganUmumPDFReport groupedTransactions={groupedTransactions} stats={stats} filterInfo={getFilterInfo()} />
                </div>
            </div>
            <section>
                <Card className="shadow-strong-pekat border-2 border-black">
                    <CardHeader className="flex-row items-center justify-between p-4"><CardTitle className="text-sm">Filter Data</CardTitle><Button onClick={handleDownloadPDF} disabled={isDownloading} size="sm" className="shadow-button-pekat border-black border-2 active:shadow-none text-xs"><Download className="mr-2 h-4 w-4"/>{isDownloading ? 'Mengunduh...' : 'Unduh'}</Button></CardHeader>
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center"><div className="flex gap-2"><Button size="sm" variant={filterMode === 'monthly' ? 'default' : 'outline'} onClick={() => setFilterMode('monthly')}>Bulanan</Button><Button size="sm" variant={filterMode === 'daily' ? 'default' : 'outline'} onClick={() => setFilterMode('daily')}>Harian</Button><Button size="sm" variant={filterMode === 'all' ? 'default' : 'outline'} onClick={() => setFilterMode('all')}>Semua</Button></div><div className="flex-1 w-full">{filterMode === 'daily' && (<Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />)}{filterMode === 'monthly' && (<Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />)}</div></CardContent>
                </Card>
            </section>
            
            <section>
                <h2 className="text-lg font-bold mb-2">Rincian Uang</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-4">
                    <StatCard title="Total Semua Uang" value={stats.totalSemua} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}/>
                    <StatCard title="Uang Keluar" value={Math.abs(stats.totalUangKeluar)} />
                    {Object.entries(moneyCategories).map(([category]) => ( <StatCard key={category} title={`Uang ${category}`} value={stats.kategori[category] || 0} /> ))}
                </div>
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <Card className="shadow-strong-pekat border-2 border-black"><CardHeader className="p-4"><CardTitle className="text-sm">Detail Lokasi</CardTitle></CardHeader><CardContent className="p-4">{Object.keys(stats.totalPerLokasi).length > 0 ? ( <ul className="space-y-2 text-xs">{Object.entries(stats.totalPerLokasi).map(([lokasi, total]) => ( <li key={lokasi} className="flex justify-between"><span>{lokasi}</span><span className="font-semibold">Rp {Number(total).toLocaleString('id-ID')}</span></li> ))}</ul> ) : <p className="text-xs">Belum ada data lokasi.</p>}</CardContent></Card>
                    <Card className="shadow-strong-pekat border-2 border-black"><CardHeader className="p-4"><CardTitle className="text-sm">Uang Tercatat</CardTitle></CardHeader><CardContent className="p-4"><p className="text-xl font-bold">Rp {stats.totalUangMasuk.toLocaleString('id-ID')}</p></CardContent></Card>
                </div>
            </section>
            
            <section>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-2"><h2 className="text-lg font-bold">Aktivitas</h2><div className="flex gap-2 w-full sm:w-auto">
                    <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}><DialogTrigger asChild><Button onClick={() => setIsFormOpen(true)} size="sm" className="w-full shadow-button-pekat border-2 border-black active:shadow-none text-xs"><PlusCircle className="mr-1 h-4 w-4"/> Tambah</Button></DialogTrigger><DialogContent className="flex flex-col max-h-[90vh]"><DialogHeader className="p-6 pb-2"><DialogTitle>Tambah Catatan Keuangan</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto p-6 space-y-4"><form id="financial-form" className="space-y-4" onSubmit={handleFormSubmit}><Input type="date" value={formState.shift_date || ''} onChange={(e) => setFormState(p => ({...p, shift_date: e.target.value}))} required/><Input placeholder="Nama Shift" value={formState.shift_name || ''} onChange={(e) => setFormState(p => ({...p, shift_name: e.target.value}))} /><Input placeholder="Lokasi" value={formState.lokasi || ''} onChange={(e) => setFormState(p => ({...p, lokasi: e.target.value}))} />{Object.entries(moneyCategories).map(([category, fieldName]) => ( <Input key={fieldName} placeholder={category} value={formState[fieldName] || ''} onChange={(e) => handleInputChange(e, fieldName)} /> ))}<Textarea placeholder="Keterangan" value={formState.keterangan || ''} onChange={(e) => setFormState(p => ({...p, keterangan: e.target.value}))} /></form></div><DialogFooter className="p-6 pt-4 border-t"><Button type="button" variant="outline" onClick={() => handleFormOpenChange(false)}>Batal</Button><Button type="submit" form="financial-form">Simpan</Button></DialogFooter></DialogContent></Dialog>
                    <Dialog open={isExpenseFormOpen} onOpenChange={handleExpenseFormOpenChange}><DialogTrigger asChild><Button size="sm" variant="destructive" className="w-full shadow-button-pekat border-2 border-black active:shadow-none text-xs"><ArrowDownCircle className="mr-1 h-4 w-4" /> Keluar</Button></DialogTrigger><DialogContent className="flex flex-col max-h-[90vh]"><DialogHeader className="p-6 pb-2"><DialogTitle>Catat Pengeluaran</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto p-6 space-y-4"><form id="expense-form" className="space-y-4" onSubmit={handleExpenseFormSubmit}><select value={expenseFormState.category || ''} onChange={(e) => handleExpenseInputChange(e, 'category')} className="w-full h-10 rounded-md border border-input px-3 py-2 text-sm"><option value="" disabled>Pilih Kategori Uang</option>{Object.keys(moneyCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}<option value="Lainnya">Lainnya</option></select><Input placeholder="Jumlah" value={expenseFormState.amount || ''} onChange={(e) => handleExpenseInputChange(e, 'amount')} disabled={expenseFormState.ambil_semua}/><Input placeholder="Nama Pengambil" value={expenseFormState.person_name || ''} onChange={(e) => handleExpenseInputChange(e, 'person_name')} required/><Textarea placeholder="Keterangan" value={expenseFormState.notes || ''} onChange={(e) => handleExpenseInputChange(e, 'notes')} /><div className="flex items-center space-x-2"><input type="checkbox" id="ambil_semua" checked={!!expenseFormState.ambil_semua} onChange={(e) => setExpenseFormState(p => ({...p, ambil_semua: e.target.checked, category: ''}))} /><label htmlFor="ambil_semua" className="text-sm">Tarik semua uang dari semua kategori</label></div></form></div><DialogFooter className="p-6 pt-4 border-t"><Button type="button" variant="outline" onClick={() => handleExpenseFormOpenChange(false)}>Batal</Button><Button type="submit" form="expense-form">Simpan</Button></DialogFooter></DialogContent></Dialog>
                </div></div>
                <Card><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-full text-sm">Info</TableHead><TableHead className="text-right text-sm">Opsi</TableHead></TableRow></TableHeader><TableBody>{loading ? ( <TableRow><TableCell colSpan="2" className="text-center">Memuat data...</TableCell></TableRow> ) : groupedTransactions.length > 0 ? ( groupedTransactions.map(group => { const { date, time } = formatDateTime(group.created_at); const isExpanded = expandedRowId === group.group_id; const isExpense = group.total < 0; const groupTitle = isExpense ? (group.item_taken || "Uang Keluar") : `${group.lokasi || 'Tanpa Lokasi'} - ${group.shift_name || 'Tanpa Shift'}`; return ( <Fragment key={group.group_id}><TableRow onClick={() => setExpandedRowId(isExpanded ? null : group.group_id)} className="cursor-pointer"><TableCell className="font-medium text-sm"><div className="flex justify-between items-center"><div className="flex flex-col"><span>{groupTitle}</span><span className="text-xs text-gray-500">{date} {time}</span><span className={`font-semibold mt-1 ${isExpense ? 'text-red-600' : 'text-green-600'}`}>{isExpense ? '' : '+'} Rp {Math.abs(group.total).toLocaleString('id-ID')}</span></div><ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></div></TableCell><TableCell className="text-right"><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8 shadow-button-pekat border-2 border-black active:shadow-none" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus semua entri dalam grup aktivitas ini.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteGroup(group.group_id)}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>{isExpanded && ( <TableRow className="bg-white dark:bg-background"><TableCell colSpan={2} className="p-4">{isExpense ? ( <div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Diambil oleh:</span> <span className="font-semibold">{group.person_name || '-'}</span></div>{group.details.map(detail => ( <div key={detail.id} className="flex justify-between"><span className="text-muted-foreground">{detail.item_taken || `${detail.category}`}:</span><span className="font-semibold text-red-600">- Rp {Math.abs(detail.amount).toLocaleString('id-ID')}</span></div> ))}{group.notes && <div className="pt-2 border-t"><p className="text-xs font-semibold">Keterangan:</p><p className="text-xs text-muted-foreground">{group.notes}</p></div>}</div> ) : ( <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{group.details.map(detail => ( <div key={detail.id} className="flex flex-col text-xs"><span className="text-muted-foreground text-xs">{detail.category}</span><div className="bg-muted rounded-md px-3 py-1 mt-1 font-semibold">Rp {(detail.amount || 0).toLocaleString('id-ID')}</div></div> ))}{group.notes && (<div className="mt-4 pt-2 border-t col-span-full"><p className="text-xs font-semibold">Keterangan:</p><p className="text-xs text-muted-foreground">{group.notes}</p></div>)}</div> )}</TableCell></TableRow> )}</Fragment> ); }) ) : ( <TableRow><TableCell colSpan="2" className="text-center text-sm">Belum ada aktivitas.</TableCell></TableRow> )}</TableBody></Table></div></Card>
            </section>
        </div>
    );
};

const GajiShiftTab = () => {
    const { shifts, shiftActivities, addShift, updateShift, deleteShift, addShiftActivity, updateShiftActivity, deleteShiftActivity, loading } = useData();
    const { toast } = useToast();
    
    const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
    const [shiftForm, setShiftForm] = useState({});
    const [editingShift, setEditingShift] = useState(null);
    const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
    const [activityForm, setActivityForm] = useState({ type: 'kasbon', activity_date: new Date().toISOString().slice(0, 10) });
    const [editingActivity, setEditingActivity] = useState(null);
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [expandedShiftId, setExpandedShiftId] = useState(null);
    const reportRef = useRef();
    const [isDownloading, setIsDownloading] = useState(false);

    // Ref dan state baru untuk PDF Aktivitas
    const aktivitasReportRef = useRef();
    const [isDownloadingAktivitas, setIsDownloadingAktivitas] = useState(false);

    const primaryButtonStyles = "shadow-button-pekat border-black border-2 active:shadow-none text-xs sm:text-sm";
    
    const handleShiftFormOpen = (shift = null) => {
        setEditingShift(shift);
        if (shift) {
            setShiftForm({ ...shift, daily_wage: formatNumberInput(String(shift.daily_wage)) });
        } else {
            setShiftForm({});
        }
        setIsShiftFormOpen(true);
    };

    const handleShiftFormClose = () => {
        setIsShiftFormOpen(false);
        setEditingShift(null);
        setShiftForm({});
    };

    const handleActivityFormOpen = (type, activity = null) => {
        const initialFormState = {
            type,
            activity_date: activity ? activity.activity_date : new Date().toISOString().slice(0, 10),
            notes: activity ? activity.notes : '',
            amount: activity && activity.amount ? formatNumberInput(String(activity.amount)) : '',
            shift_id: activity ? activity.shift_id : ''
        };
        setEditingActivity(activity);
        setActivityForm(initialFormState);
        setIsActivityFormOpen(true);
    };
    
    const handleActivityFormClose = () => {
        setIsActivityFormOpen(false);
        setEditingActivity(null);
        setActivityForm({ type: 'kasbon', activity_date: new Date().toISOString().slice(0, 10) });
    };

    const handleShiftSubmit = async (e) => {
        e.preventDefault();
        const data = { 
            shift_name: shiftForm.shift_name,
            lokasi: shiftForm.lokasi,
            daily_wage: parseInt(parseFormattedNumber(shiftForm.daily_wage || '0'), 10) 
        };
        const result = editingShift ? await updateShift(editingShift.id, data) : await addShift(data);
        if (result.success) {
            toast({ title: "Sukses", description: `Shift berhasil di${editingShift ? 'perbarui' : 'tambahkan'}.` });
            handleShiftFormClose();
        } else {
            toast({ variant: "destructive", title: "Gagal", description: result.error.message });
        }
    };

    const handleDeleteShiftConfirm = async (id) => {
        await deleteShift(id);
        toast({ title: "Sukses", description: "Shift berhasil dihapus." });
    };
    
    const handleActivitySubmit = async (e) => {
        e.preventDefault();
        if(!activityForm.shift_id && !editingActivity) {
            return toast({ variant: "destructive", title: "Gagal", description: "Silakan pilih shift terlebih dahulu." });
        }
        const data = {
            shift_id: editingActivity ? editingActivity.shift_id : activityForm.shift_id,
            activity_date: activityForm.activity_date,
            type: activityForm.type,
            amount: activityForm.type === 'kasbon' ? parseInt(parseFormattedNumber(activityForm.amount || '0'), 10) : null,
            notes: activityForm.notes,
        };
        const result = editingActivity?.id ? await updateShiftActivity(editingActivity.id, data) : await addShiftActivity(data);
        if(result.success){
            toast({title: "Sukses", description: `Aktivitas berhasil di${editingActivity?.id ? 'perbarui' : 'catat'}.`});
            handleActivityFormClose();
        } else {
            toast({ variant: "destructive", title: "Gagal", description: result.error.message });
        }
    }

    const handleDeleteActivityConfirm = async (id) => {
        await deleteShiftActivity(id);
        toast({ title: "Sukses", description: "Aktivitas berhasil dihapus." });
    }
    
    const salaryData = useMemo(() => {
        const [year, month] = filterMonth.split('-').map(Number);
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        let daysInPeriod;
        if (year === currentYear && month === currentMonth) {
            daysInPeriod = today.getDate();
        } else {
            daysInPeriod = new Date(year, month, 0).getDate();
        }
        return shifts.map(s => {
            const activities = shiftActivities.filter(act => act.shift_id === s.id && act.activity_date.startsWith(filterMonth)).sort((a,b) => new Date(a.activity_date) - new Date(b.activity_date));
            const totalKasbon = activities.filter(a => a.type === 'kasbon').reduce((sum, a) => sum + (a.amount || 0), 0);
            const totalLibur = activities.filter(a => a.type === 'libur').length;
            const hariKerja = daysInPeriod - totalLibur;
            const gajiAkhir = (s.daily_wage * hariKerja) - totalKasbon;
            return { ...s, hariKerja, totalKasbon, totalLibur, gajiAkhir, activities };
        }).sort((a, b) => a.shift_name.localeCompare(b.shift_name) || a.lokasi.localeCompare(b.lokasi));
    }, [shifts, shiftActivities, filterMonth]);

    const handleDownloadGajiPDF = async () => {
        if (salaryData.length === 0) {
            return toast({ variant: "destructive", title: "Tidak ada data untuk diunduh." });
        }
        setIsDownloading(true);
    
        const pdf = new jsPDF('p', 'mm', 'a4');
        const reportContainer = reportRef.current;
    
        for (let i = 0; i < salaryData.length; i++) {
            const shiftData = salaryData[i];
            const element = reportContainer.querySelector(`.salary-report-item[data-id="${shiftData.id}"]`);
            
            if (element) {
                if (i > 0) {
                    pdf.addPage();
                }
    
                const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
                pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, imgHeight);
            }
        }
        
        pdf.save(`laporan-gaji-${filterMonth}.pdf`);
        setIsDownloading(false);
    };

    const handleDownloadAktivitasPDF = async () => {
        if (salaryData.flatMap(d => d.activities).length === 0) {
            return toast({ variant: "destructive", title: "Tidak ada aktivitas untuk diunduh." });
        }
        setIsDownloadingAktivitas(true);
        const reportElement = aktivitasReportRef.current;
        const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`laporan-aktivitas-${filterMonth}.pdf`);
        setIsDownloadingAktivitas(false);
    };
    

    return (
        <div className="space-y-4">
            <div style={{ position: 'absolute', left: '-9999px', zIndex: -1 }}>
                <div ref={reportRef}>
                    <GajiShiftReport salaryData={salaryData} filterMonth={filterMonth} />
                </div>
                <div ref={aktivitasReportRef}>
                    <ShiftActivityPDFReport salaryData={salaryData} filterMonth={filterMonth} />
                </div>
            </div>
            <Card className="shadow-strong-pekat border-2 border-black">
                <CardHeader className="flex-row items-center justify-between p-4">
                    <CardTitle className="text-sm">Filter & Unduh Laporan</CardTitle>
                    <div className='flex gap-2'>
                        <Button onClick={handleDownloadAktivitasPDF} disabled={isDownloadingAktivitas} size="sm" className={primaryButtonStyles} variant="outline">
                            <Download className="mr-2 h-4 w-4"/>
                            {isDownloadingAktivitas ? 'Mengunduh...' : 'Aktivitas'}
                        </Button>
                        <Button onClick={handleDownloadGajiPDF} disabled={isDownloading} size="sm" className={primaryButtonStyles}>
                            <Download className="mr-2 h-4 w-4"/>
                            {isDownloading ? 'Mengunduh...' : 'Gaji'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="max-w-xs"/>
                </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2 justify-end">
                <Button className={primaryButtonStyles} onClick={() => handleActivityFormOpen('kasbon')}>+ Kasbon</Button>
                <Button className={primaryButtonStyles} onClick={() => handleActivityFormOpen('libur')}>+ Libur</Button>
                <Button className={primaryButtonStyles} onClick={() => handleShiftFormOpen()}><Briefcase className="mr-1 h-4 w-4"/> Tambah Shift</Button>
            </div>
            
            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead className="whitespace-nowrap text-xs">Shift</TableHead>
                            <TableHead className="whitespace-nowrap text-xs">Hari Kerja</TableHead>
                            <TableHead className="whitespace-nowrap text-xs">Total Gaji</TableHead>
                            <TableHead className="text-right whitespace-nowrap text-xs">Opsi</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {loading ? <TableRow><TableCell colSpan={4} className="text-center text-sm">Memuat...</TableCell></TableRow> : salaryData.map(data => {
                              const isExpanded = expandedShiftId === data.id;
                              return (
                                <Fragment key={data.id}>
                                    <TableRow onClick={() => setExpandedShiftId(isExpanded ? null : data.id)} className="cursor-pointer">
                                        <TableCell className="font-semibold text-xs">{data.shift_name} <span className="text-muted-foreground">({data.lokasi})</span></TableCell>
                                        <TableCell className="text-xs">{data.hariKerja} hari</TableCell>
                                        <TableCell className="font-bold text-xs">Rp {data.gajiAkhir.toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleShiftFormOpen(data);}}><Edit className="h-4 w-4" /></Button>
                                                <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4 text-red-600"/></Button></AlertDialogTrigger>
                                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Yakin hapus shift?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus shift dan semua aktivitas kasbon/libur yang terkait.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteShiftConfirm(data.id)}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                </AlertDialog>
                                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                        <TableRow className="bg-white dark:bg-background">
                                            <TableCell colSpan={4} className="p-3 space-y-3">
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold text-xs">Rincian Kasbon (-Rp {data.totalKasbon.toLocaleString('id-ID')})</h4>
                                                    {data.activities.filter(a => a.type === 'kasbon').length > 0 ? (
                                                        <ul className="space-y-1 text-xs">{data.activities.filter(a => a.type === 'kasbon').map(a => (
                                                            <li key={a.id} className="p-2 rounded-md bg-muted/50"><div className="flex justify-between items-start gap-2">
                                                                <div className="flex-1 min-w-0"><p className="break-words">{formatDateTime(a.activity_date).date} - <span className="font-semibold text-red-600">Rp {a.amount.toLocaleString('id-ID')}</span></p>{a.notes && <p className="text-xs text-muted-foreground break-words">{a.notes}</p>}</div>
                                                                <div className="flex flex-shrink-0"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleActivityFormOpen('kasbon', a)}><Edit className="h-3 w-3"/></Button>
                                                                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3 w-3 text-red-500"/></Button></AlertDialogTrigger>
                                                                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Yakin hapus aktivitas?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteActivityConfirm(a.id)}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                                    </AlertDialog>
                                                                </div>
                                                            </div></li>))}
                                                        </ul>
                                                    ) : <p className="text-xs text-muted-foreground pl-2">Tidak ada kasbon.</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold text-xs">Rincian Libur ({data.totalLibur} hari)</h4>
                                                    {data.activities.filter(a => a.type === 'libur').length > 0 ? (
                                                        <ul className="space-y-1 text-xs">{data.activities.filter(a => a.type === 'libur').map(a => (
                                                            <li key={a.id} className="p-2 rounded-md bg-muted/50"><div className="flex justify-between items-start gap-2">
                                                                <div className="flex-1 min-w-0"><p className="break-words">{formatDateTime(a.activity_date).date}</p>{a.notes && <p className="text-xs text-muted-foreground break-words">{a.notes}</p>}</div>
                                                                <div className="flex flex-shrink-0"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleActivityFormOpen('libur', a)}><Edit className="h-3 w-3"/></Button>
                                                                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3 w-3 text-red-500"/></Button></AlertDialogTrigger>
                                                                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Yakin hapus aktivitas?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteActivityConfirm(a.id)}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                                    </AlertDialog>
                                                                </div>
                                                            </div></li>))}
                                                        </ul>
                                                    ) : <p className="text-xs text-muted-foreground pl-2">Tidak ada libur.</p>}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                              )})}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <Dialog open={isShiftFormOpen} onOpenChange={handleShiftFormClose}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingShift ? 'Edit' : 'Tambah'} Shift</DialogTitle></DialogHeader>
                    <form onSubmit={handleShiftSubmit} className="space-y-4 pt-4">
                        <Input placeholder="Nama Shift" value={shiftForm.shift_name || ''} onChange={(e) => setShiftForm(p => ({...p, shift_name: e.target.value}))} required/>
                        <Input placeholder="Lokasi" value={shiftForm.lokasi || ''} onChange={(e) => setShiftForm(p => ({...p, lokasi: e.target.value}))} required/>
                        <Input placeholder="Uang Bulanan" value={shiftForm.daily_wage || ''} onChange={(e) => setShiftForm(p => ({...p, daily_wage: formatNumberInput(e.target.value)}))} required/>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleShiftFormClose}>Batal</Button>
                            <Button type="submit" className={primaryButtonStyles}>Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isActivityFormOpen} onOpenChange={handleActivityFormClose}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingActivity?.id ? 'Edit' : 'Tambah'} {activityForm.type === 'kasbon' ? 'Kasbon' : 'Libur'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleActivitySubmit} className="space-y-4 pt-4">
                        {!editingActivity && (
                            <Select onValueChange={(value) => setActivityForm(p => ({...p, shift_id: value}))} required>
                                <SelectTrigger><SelectValue placeholder="Pilih Shift" /></SelectTrigger>
                                <SelectContent>{shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.shift_name} - {s.lokasi}</SelectItem>)}</SelectContent>
                            </Select>
                        )}
                        <Input type="date" value={activityForm.activity_date} onChange={(e) => setActivityForm(p => ({...p, activity_date: e.target.value}))} required/>
                        {activityForm.type === 'kasbon' && <Input placeholder="Jumlah Kasbon" value={activityForm.amount || ''} onChange={(e) => setActivityForm(p => ({...p, amount: formatNumberInput(e.target.value)}))} required/>}
                        <Textarea placeholder="Keterangan (opsional)" value={activityForm.notes || ''} onChange={(e) => setActivityForm(p => ({...p, notes: e.target.value}))} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleActivityFormClose}>Batal</Button>
                            <Button type="submit" className={primaryButtonStyles}>Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default NewAdminDashboard;