import React, { useState, useMemo, Fragment, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumberInput, parseFormattedNumber, formatDateTime } from '@/lib/utils';
import { PlusCircle, Trash2, ArrowDownCircle, DollarSign, ChevronDown, LogOut, Download, Briefcase } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Komponen PDF untuk Keuangan Umum
const KeuanganUmumReport = ({ transactions, stats, filterInfo }) => (
    <div className="p-8 bg-white" style={{ width: '800px' }}>
      <div className="flex justify-between items-center mb-8 pb-4 border-b">
        <div>
            <h1 className="text-3xl font-bold">Laporan Keuangan Umum</h1>
            <p className="text-muted-foreground">{filterInfo}</p>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Ringkasan Statistik</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-100 p-4 rounded-lg"><p className="text-muted-foreground">Total Pemasukan</p><p className="font-bold text-lg text-green-600">Rp {stats.totalUangMasuk.toLocaleString('id-ID')}</p></div>
            <div className="bg-gray-100 p-4 rounded-lg"><p className="text-muted-foreground">Total Pengeluaran</p><p className="font-bold text-lg text-red-600">- Rp {Math.abs(stats.totalUangKeluar).toLocaleString('id-ID')}</p></div>
            <div className="bg-blue-100 p-4 rounded-lg"><p className="text-muted-foreground">Saldo Akhir</p><p className="font-bold text-lg text-blue-700">Rp {stats.totalSemua.toLocaleString('id-ID')}</p></div>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Rincian Aktivitas</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left p-2">Tanggal</th><th className="text-left p-2">Aktivitas</th><th className="text-left p-2">Kategori</th><th className="text-right p-2">Jumlah</th></tr></thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} className="border-b">
                <td className="p-2">{formatDateTime(t.created_at).date}</td>
                <td className="p-2">{t.item_taken || `${t.shift_name} - ${t.lokasi}`}</td>
                <td className="p-2">{t.category}</td>
                <td className={`p-2 text-right font-semibold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>Rp {t.amount.toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
);

// Komponen PDF untuk Gaji Shift (Diperbarui)
const GajiShiftReport = ({ salaryData, filterMonth }) => (
    <div className="p-8 bg-white" style={{ width: '800px' }}>
        <h1 className="text-3xl font-bold mb-2">Laporan Gaji Shift</h1>
        <p className="text-muted-foreground mb-8">Periode: {filterMonth}</p>
        {salaryData.map(data => (
            <div key={data.id} className="mb-6 border-b pb-4">
                <h3 className="text-xl font-semibold mb-2">{data.shift_name} - {data.lokasi}</h3>
                <div className="grid grid-cols-4 gap-4 text-sm mb-2">
                    <div><p className="text-muted-foreground">Uang Harian:</p><p className="font-bold">Rp {data.daily_wage.toLocaleString('id-ID')}</p></div>
                    <div><p className="text-muted-foreground">Hari Kerja:</p><p className="font-bold">{data.hariKerja} hari</p></div>
                    <div><p className="text-muted-foreground">Total Libur:</p><p className="font-bold">{data.totalLibur} hari</p></div>
                    <div><p className="text-muted-foreground">Total Kasbon:</p><p className="font-bold">Rp {data.totalKasbon.toLocaleString('id-ID')}</p></div>
                </div>
                <div className="bg-gray-100 p-3 rounded-md flex justify-between items-center">
                    <span className="font-bold">Total Gaji Diterima:</span>
                    <span className="font-bold text-lg">Rp {data.gajiAkhir.toLocaleString('id-ID')}</span>
                </div>
            </div>
        ))}
    </div>
);


const NewAdminDashboard = () => {
    // ... State utama dan hooks
    const { logout } = useAuth();

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
          <header className="flex items-center justify-between p-4 bg-white shadow-md">
            <h1 className="text-lg font-bold">Haw Reload</h1>
            <Button onClick={logout} variant="outline" size="sm">
                <span className="hidden sm:inline">Logout</span>
                <LogOut className="sm:hidden h-4 w-4"/>
            </Button>
          </header>
          <main className="flex-1 p-2 sm:p-4 md:p-8">
            <div className="w-full max-w-7xl mx-auto space-y-6">
                <Tabs defaultValue="keuangan-umum" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="keuangan-umum">Keuangan Umum</TabsTrigger>
                        <TabsTrigger value="gaji-shift">Gaji Shift</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="keuangan-umum" className="mt-4">
                        <KeuanganUmumTab /> 
                    </TabsContent>

                    <TabsContent value="gaji-shift" className="mt-4">
                        <GajiShiftTab />
                    </TabsContent>
                </Tabs>
            </div>
          </main>
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

    const moneyCategories = {
        'Ratusan': 'uang_ratusan',
        'Puluhan': 'uang_puluhan',
        '2 Ribuan': 'uang_2ribuan',
        'Koin': 'uang_koin',
        'Aksesoris': 'uang_aksesoris',
        'On Mobile': 'uang_onmobile',
    };
    
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
        const canvas = await html2canvas(reportElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`laporan-umum-${filterMode}-${filterMode === 'daily' ? selectedDate : selectedMonth}.pdf`);
        setIsDownloading(false);
    };

    const getFilterInfo = () => {
        if (filterMode === 'daily') return `Laporan Harian: ${selectedDate}`;
        if (filterMode === 'monthly') return `Laporan Bulanan: ${selectedMonth}`;
        return 'Laporan Semua Aktivitas';
    };

    const StatCard = ({ title, value, icon }) => ( <Card className="shadow-strong-pekat border-2 border-black"><CardHeader className="flex flex-row items-center justify-between space-y-0 p-3"><CardTitle className="text-xs font-medium">{title}</CardTitle>{icon}</CardHeader><CardContent className="p-3 pt-0"><div className="text-lg font-bold">Rp {Number(value).toLocaleString('id-ID')}</div></CardContent></Card> );

    return (
        <div className="space-y-6">
            <div style={{ position: 'absolute', left: '-9999px', zIndex: -1 }}><div ref={reportRef}><KeuanganUmumReport transactions={filteredTransactions} stats={stats} filterInfo={getFilterInfo()} /></div></div>
            <section>
                <Card className="shadow-strong-pekat border-2 border-black">
                    <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Filter Data</CardTitle><Button onClick={handleDownloadPDF} disabled={isDownloading} size="sm" className="shadow-button-pekat border-black border-2 active:shadow-none"><Download className="mr-2 h-4 w-4"/>{isDownloading ? 'Mengunduh...' : 'Unduh Laporan'}</Button></CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4 items-center"><div className="flex gap-2"><Button size="sm" variant={filterMode === 'monthly' ? 'default' : 'outline'} onClick={() => setFilterMode('monthly')}>Bulanan</Button><Button size="sm" variant={filterMode === 'daily' ? 'default' : 'outline'} onClick={() => setFilterMode('daily')}>Harian</Button><Button size="sm" variant={filterMode === 'all' ? 'default' : 'outline'} onClick={() => setFilterMode('all')}>Semua</Button></div><div className="flex-1 w-full">{filterMode === 'daily' && (<Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />)}{filterMode === 'monthly' && (<Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />)}</div></CardContent>
                </Card>
            </section>
            
            <section>
                <h2 className="text-xl font-bold mb-4">Rincian Uang</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <StatCard title="Total Saldo Saat Ini" value={stats.totalSemua} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}/>
                    <StatCard title="Uang Keluar" value={Math.abs(stats.totalUangKeluar)} />
                    {Object.entries(moneyCategories).map(([category]) => ( <StatCard key={category} title={`Uang ${category}`} value={stats.kategori[category] || 0} /> ))}
                </div>
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <Card className="shadow-strong-pekat border-2 border-black"><CardHeader className="p-4"><CardTitle className="text-base">Total Saldo per Lokasi</CardTitle></CardHeader><CardContent className="p-4">{Object.keys(stats.totalPerLokasi).length > 0 ? ( <ul className="space-y-2 text-sm">{Object.entries(stats.totalPerLokasi).map(([lokasi, total]) => ( <li key={lokasi} className="flex justify-between"><span>{lokasi}</span><span className="font-semibold">Rp {Number(total).toLocaleString('id-ID')}</span></li> ))}</ul> ) : <p className="text-sm">Belum ada data lokasi.</p>}</CardContent></Card>
                    <Card className="shadow-strong-pekat border-2 border-black"><CardHeader className="p-4"><CardTitle className="text-base">Uang Tercatat</CardTitle></CardHeader><CardContent className="p-4"><p className="text-2xl font-bold">Rp {stats.totalUangMasuk.toLocaleString('id-ID')}</p></CardContent></Card>
                </div>
            </section>
            
            <section>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2"><h2 className="text-xl font-bold">Aktivitas</h2><div className="flex gap-2 w-full sm:w-auto">
                    <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}><DialogTrigger asChild><Button onClick={() => setIsFormOpen(true)} size="sm" className="w-full shadow-button-pekat border-2 border-black active:shadow-none text-xs"><PlusCircle className="mr-2 h-4 w-4"/> Tambah</Button></DialogTrigger><DialogContent className="flex flex-col max-h-[90vh]"><DialogHeader className="p-6 pb-2"><DialogTitle>Tambah Catatan Keuangan</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto p-6 space-y-4"><form id="financial-form" className="space-y-4" onSubmit={handleFormSubmit}><Input type="date" value={formState.shift_date || ''} onChange={(e) => setFormState(p => ({...p, shift_date: e.target.value}))} required/><Input placeholder="Nama Shift" value={formState.shift_name || ''} onChange={(e) => setFormState(p => ({...p, shift_name: e.target.value}))} /><Input placeholder="Lokasi" value={formState.lokasi || ''} onChange={(e) => setFormState(p => ({...p, lokasi: e.target.value}))} />{Object.entries(moneyCategories).map(([category, fieldName]) => ( <Input key={fieldName} placeholder={category} value={formState[fieldName] || ''} onChange={(e) => handleInputChange(e, fieldName)} /> ))}<Textarea placeholder="Keterangan" value={formState.keterangan || ''} onChange={(e) => setFormState(p => ({...p, keterangan: e.target.value}))} /></form></div><DialogFooter className="p-6 pt-4 border-t"><Button type="button" variant="outline" onClick={() => handleFormOpenChange(false)}>Batal</Button><Button type="submit" form="financial-form">Simpan</Button></DialogFooter></DialogContent></Dialog>
                    <Dialog open={isExpenseFormOpen} onOpenChange={handleExpenseFormOpenChange}><DialogTrigger asChild><Button size="sm" variant="destructive" className="w-full shadow-button-pekat border-2 border-black active:shadow-none text-xs"><ArrowDownCircle className="mr-2 h-4 w-4" /> Keluar</Button></DialogTrigger><DialogContent className="flex flex-col max-h-[90vh]"><DialogHeader className="p-6 pb-2"><DialogTitle>Catat Pengeluaran</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto p-6 space-y-4"><form id="expense-form" className="space-y-4" onSubmit={handleExpenseFormSubmit}><select value={expenseFormState.category || ''} onChange={(e) => handleExpenseInputChange(e, 'category')} className="w-full h-10 rounded-md border border-input px-3 py-2 text-sm"><option value="" disabled>Pilih Kategori Uang</option>{Object.keys(moneyCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}<option value="Lainnya">Lainnya</option></select><Input placeholder="Jumlah" value={expenseFormState.amount || ''} onChange={(e) => handleExpenseInputChange(e, 'amount')} disabled={expenseFormState.ambil_semua}/><Input placeholder="Nama Pengambil" value={expenseFormState.person_name || ''} onChange={(e) => handleExpenseInputChange(e, 'person_name')} required/><Textarea placeholder="Keterangan" value={expenseFormState.notes || ''} onChange={(e) => handleExpenseInputChange(e, 'notes')} /><div className="flex items-center space-x-2"><input type="checkbox" id="ambil_semua" checked={!!expenseFormState.ambil_semua} onChange={(e) => setExpenseFormState(p => ({...p, ambil_semua: e.target.checked, category: ''}))} /><label htmlFor="ambil_semua" className="text-sm">Tarik semua uang dari semua kategori</label></div></form></div><DialogFooter className="p-6 pt-4 border-t"><Button type="button" variant="outline" onClick={() => handleExpenseFormOpenChange(false)}>Batal</Button><Button type="submit" form="expense-form">Simpan</Button></DialogFooter></DialogContent></Dialog>
                </div></div>
                <Card><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-full">Info</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{loading ? ( <TableRow><TableCell colSpan="2" className="text-center">Memuat data...</TableCell></TableRow> ) : groupedTransactions.length > 0 ? ( groupedTransactions.map(group => { const { date, time } = formatDateTime(group.created_at); const isExpanded = expandedRowId === group.group_id; const isExpense = group.total < 0; const groupTitle = isExpense ? (group.item_taken || "Uang Keluar") : `${group.lokasi || 'Tanpa Lokasi'} - ${group.shift_name || 'Tanpa Shift'}`; return ( <Fragment key={group.group_id}><TableRow onClick={() => setExpandedRowId(isExpanded ? null : group.group_id)} className="cursor-pointer"><TableCell className="font-medium"><div className="flex justify-between items-center"><div className="flex flex-col"><span>{groupTitle}</span><span className="text-xs text-gray-500">{date} {time}</span><span className={`font-bold mt-1 ${isExpense ? 'text-red-600' : 'text-green-600'}`}>{isExpense ? '' : '+'} Rp {Math.abs(group.total).toLocaleString('id-ID')}</span></div><ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></div></TableCell><TableCell className="text-right"><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8 shadow-button-pekat border-2 border-black active:shadow-none" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus semua entri dalam grup aktivitas ini.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteGroup(group.group_id)}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>{isExpanded && ( <TableRow className="bg-white dark:bg-background"><TableCell colSpan={2} className="p-4">{isExpense ? ( <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Diambil oleh:</span> <span className="font-semibold">{group.person_name || '-'}</span></div>{group.details.map(detail => ( <div key={detail.id} className="flex justify-between"><span className="text-muted-foreground">{detail.item_taken || `${detail.category}`}:</span><span className="font-semibold text-red-600">- Rp {Math.abs(detail.amount).toLocaleString('id-ID')}</span></div> ))}{group.notes && <div className="pt-2 border-t"><p className="text-xs font-semibold">Keterangan:</p><p className="text-sm text-muted-foreground">{group.notes}</p></div>}</div> ) : ( <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{group.details.map(detail => ( <div key={detail.id} className="flex flex-col text-sm"><span className="text-muted-foreground text-xs">{detail.category}</span><div className="bg-muted rounded-md px-3 py-1 mt-1 font-semibold">Rp {(detail.amount || 0).toLocaleString('id-ID')}</div></div> ))}{group.notes && (<div className="mt-4 pt-2 border-t col-span-full"><p className="text-sm font-semibold">Keterangan:</p><p className="text-sm text-muted-foreground">{group.notes}</p></div>)}</div> )}</TableCell></TableRow> )}</Fragment> ); }) ) : ( <TableRow><TableCell colSpan="2" className="text-center">Belum ada aktivitas.</TableCell></TableRow> )}</TableBody></Table></div></Card>
            </section>
        </div>
    );
};

const GajiShiftTab = () => {
    const { shifts, shiftActivities, addShift, addShiftActivity, loading } = useData();
    const { toast } = useToast();
    const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
    const [isKasbonFormOpen, setIsKasbonFormOpen] = useState(false);
    const [isLiburFormOpen, setIsLiburFormOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [shiftForm, setShiftForm] = useState({});
    const [kasbonForm, setKasbonForm] = useState({});
    const [liburForm, setLiburForm] = useState({});
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const reportRef = useRef();
    const [isDownloading, setIsDownloading] = useState(false);

    const handleShiftSubmit = async (e) => {
        e.preventDefault();
        const data = { 
            shift_name: shiftForm.shift_name,
            lokasi: shiftForm.lokasi,
            daily_wage: parseInt(parseFormattedNumber(shiftForm.daily_wage || '0'), 10) 
        };
        const result = await addShift(data);
        if (result.success) {
            toast({ title: "Sukses", description: "Shift berhasil ditambahkan." });
            setIsShiftFormOpen(false);
            setShiftForm({});
        } else {
            toast({ variant: "destructive", title: "Gagal", description: result.error.message });
        }
    };
    
    const handleActivitySubmit = async (type) => {
        const form = type === 'kasbon' ? kasbonForm : liburForm;
        const data = {
            shift_id: selectedShift.id,
            activity_date: form.activity_date || new Date().toISOString().slice(0, 10),
            type: type,
            amount: type === 'kasbon' ? parseInt(parseFormattedNumber(form.amount || '0'), 10) : null,
            notes: form.notes,
        };
        const result = await addShiftActivity(data);
        if(result.success){
            toast({title: "Sukses", description: `Aktivitas ${type} berhasil dicatat.`});
            if (type === 'kasbon') setIsKasbonFormOpen(false); else setIsLiburFormOpen(false);
            setKasbonForm({}); setLiburForm({});
        } else {
            toast({ variant: "destructive", title: "Gagal", description: result.error.message });
        }
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
            const activities = shiftActivities.filter(act => act.shift_id === s.id && act.activity_date.startsWith(filterMonth));
            const totalKasbon = activities.filter(a => a.type === 'kasbon').reduce((sum, a) => sum + (a.amount || 0), 0);
            const totalLibur = activities.filter(a => a.type === 'libur').length;
            const hariKerja = daysInPeriod - totalLibur;
            const gajiAkhir = (s.daily_wage * hariKerja) - totalKasbon;
            return { ...s, hariKerja, totalKasbon, totalLibur, gajiAkhir };
        }).sort((a, b) => a.shift_name.localeCompare(b.shift_name) || a.lokasi.localeCompare(b.lokasi));
    }, [shifts, shiftActivities, filterMonth]);

    const handleDownloadGajiPDF = async () => {
        if(salaryData.length === 0) return toast({variant: "destructive", title: "Tidak ada data untuk diunduh."});
        setIsDownloading(true);
        const reportElement = reportRef.current;
        const canvas = await html2canvas(reportElement, {scale: 2});
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`laporan-gaji-${filterMonth}.pdf`);
        setIsDownloading(false);
    };

    return (
        <div className="space-y-6">
            <div style={{ position: 'absolute', left: '-9999px', zIndex: -1 }}><div ref={reportRef}><GajiShiftReport salaryData={salaryData} filterMonth={filterMonth} /></div></div>
            <Card className="shadow-strong-pekat border-2 border-black">
                <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Filter Laporan Gaji</CardTitle><Button onClick={handleDownloadGajiPDF} disabled={isDownloading} size="sm" className="shadow-button-pekat border-black border-2 active:shadow-none"><Download className="mr-2 h-4 w-4"/>{isDownloading ? 'Mengunduh...' : 'Unduh Laporan'}</Button></CardHeader>
                <CardContent>
                    <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="max-w-xs"/>
                </CardContent>
            </Card>

            <div className="text-right">
                <Dialog open={isShiftFormOpen} onOpenChange={setIsShiftFormOpen}><DialogTrigger asChild><Button><Briefcase className="mr-2 h-4 w-4"/> Tambah Shift</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Tambah Shift Baru</DialogTitle></DialogHeader><form onSubmit={handleShiftSubmit} className="space-y-4 pt-4"><Input placeholder="Nama Shift" value={shiftForm.shift_name || ''} onChange={(e) => setShiftForm(p => ({...p, shift_name: e.target.value}))} required/><Input placeholder="Lokasi" value={shiftForm.lokasi || ''} onChange={(e) => setShiftForm(p => ({...p, lokasi: e.target.value}))} required/><Input placeholder="Uang Harian" value={shiftForm.daily_wage || ''} onChange={(e) => setShiftForm(p => ({...p, daily_wage: formatNumberInput(e.target.value)}))} required/><DialogFooter><Button type="submit">Simpan</Button></DialogFooter></form></DialogContent></Dialog>
            </div>
            
            <Card>
                <Table>
                    <TableHeader><TableRow><TableHead>Shift</TableHead><TableHead>Uang Harian</TableHead><TableHead>Hari Kerja (Libur)</TableHead><TableHead>Total Kasbon</TableHead><TableHead>Total Gaji</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan="6" className="text-center">Memuat...</TableCell></TableRow> : salaryData.map(data => (
                            <TableRow key={data.id}>
                                <TableCell className="font-semibold">{data.shift_name} - {data.lokasi}</TableCell>
                                <TableCell>Rp {data.daily_wage.toLocaleString('id-ID')}</TableCell>
                                <TableCell>{data.hariKerja} ({data.totalLibur} libur)</TableCell>
                                <TableCell>Rp {data.totalKasbon.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="font-bold">Rp {data.gajiAkhir.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => { setSelectedShift(data); setIsKasbonFormOpen(true); }}>Kasbon</Button>
                                    <Button size="sm" variant="outline" className="ml-2" onClick={() => { setSelectedShift(data); setIsLiburFormOpen(true); }}>Libur</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={isKasbonFormOpen} onOpenChange={setIsKasbonFormOpen}><DialogContent><DialogHeader><DialogTitle>Tambah Kasbon untuk {selectedShift?.shift_name} ({selectedShift?.lokasi})</DialogTitle></DialogHeader><form onSubmit={(e) => {e.preventDefault(); handleActivitySubmit('kasbon');}} className="space-y-4 pt-4"><Input type="date" value={kasbonForm.activity_date || ''} onChange={(e) => setKasbonForm(p => ({...p, activity_date: e.target.value}))} required/><Input placeholder="Jumlah Kasbon" value={kasbonForm.amount || ''} onChange={(e) => setKasbonForm(p => ({...p, amount: formatNumberInput(e.target.value)}))} required/><Textarea placeholder="Keterangan (opsional)" value={kasbonForm.notes || ''} onChange={(e) => setKasbonForm(p => ({...p, notes: e.target.value}))} /><DialogFooter><Button type="button" variant="outline" onClick={() => setIsKasbonFormOpen(false)}>Batal</Button><Button type="submit">Simpan</Button></DialogFooter></form></DialogContent></Dialog>
            <Dialog open={isLiburFormOpen} onOpenChange={setIsLiburFormOpen}><DialogContent><DialogHeader><DialogTitle>Catat Libur untuk {selectedShift?.shift_name} ({selectedShift?.lokasi})</DialogTitle></DialogHeader><form onSubmit={(e) => {e.preventDefault(); handleActivitySubmit('libur');}} className="space-y-4 pt-4"><Input type="date" value={liburForm.activity_date || ''} onChange={(e) => setLiburForm(p => ({...p, activity_date: e.target.value}))} required/><Textarea placeholder="Alasan libur (opsional)" value={liburForm.notes || ''} onChange={(e) => setLiburForm(p => ({...p, notes: e.target.value}))} /><DialogFooter><Button type="button" variant="outline" onClick={() => setIsLiburFormOpen(false)}>Batal</Button><Button type="submit">Simpan</Button></DialogFooter></form></DialogContent></Dialog>
        </div>
    );
};

export default NewAdminDashboard;