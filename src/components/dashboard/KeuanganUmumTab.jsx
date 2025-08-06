import React, { useState, useMemo, Fragment, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumberInput, parseFormattedNumber, formatDateTime } from '@/lib/utils';
import { PlusCircle, Trash2, ArrowDownCircle, DollarSign, ChevronDown, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Komponen PDF dan StatCard perlu diimpor atau didefinisikan jika digunakan
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

export default KeuanganUmumTab;