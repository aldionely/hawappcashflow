import React, { useState, useMemo, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumberInput, parseFormattedNumber, formatDateTime, getLocalDateString } from '@/lib/utils';
import { Edit, Trash2, Download } from 'lucide-react';
import StatCard from './StatCard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Helper untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper untuk mendapatkan bulan ini dalam format YYYY-MM
const getThisMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};


// Komponen untuk Laporan PDF Harian
const ArusSaldoPDFReport = ({ stats, transactions, filterInfo }) => (
    <div className="p-6 bg-white" style={{ width: '800px' }}>
        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Laporan Arus Saldo</h1>
            <p className="text-gray-500 text-sm">{filterInfo}</p>
        </div>
        <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Ringkasan Statistik</h2>
            <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-blue-50 p-2 rounded"><p className="text-muted-foreground text-xs">Saldo Awal</p><p className="font-bold text-base text-blue-700">Rp {stats.saldoAwal.toLocaleString('id-ID')}</p></div>
                <div className="bg-green-50 p-2 rounded"><p className="text-muted-foreground text-xs">Uang Awal</p><p className="font-bold text-base text-green-700">Rp {stats.uangAwal.toLocaleString('id-ID')}</p></div>
                <div className="bg-blue-50 p-2 rounded"><p className="text-muted-foreground text-xs">Saldo Masuk</p><p className="font-bold text-base text-blue-700">Rp {stats.saldoMasuk.toLocaleString('id-ID')}</p></div>
                <div className="bg-red-50 p-2 rounded"><p className="text-muted-foreground text-xs">Saldo Keluar</p><p className="font-bold text-base text-red-700">- Rp {Math.abs(stats.saldoKeluar).toLocaleString('id-ID')}</p></div>
                <div className="bg-green-50 p-2 rounded"><p className="text-muted-foreground text-xs">Uang Masuk</p><p className="font-bold text-base text-green-700">Rp {stats.uangMasuk.toLocaleString('id-ID')}</p></div>
                <div className="bg-red-50 p-2 rounded"><p className="text-muted-foreground text-xs">Uang Keluar</p><p className="font-bold text-base text-red-700">- Rp {Math.abs(stats.uangKeluar).toLocaleString('id-ID')}</p></div>
                <div className="bg-blue-100 p-2 rounded"><p className="text-muted-foreground text-xs">Saldo Akhir</p><p className="font-bold text-base text-blue-800">Rp {stats.saldoAkhir.toLocaleString('id-ID')}</p></div>
                <div className="bg-green-100 p-2 rounded"><p className="text-muted-foreground text-xs">Uang Akhir</p><p className="font-bold text-base text-green-800">Rp {stats.uangAkhir.toLocaleString('id-ID')}</p></div>
            </div>
        </div>
        <div>
            <h2 className="text-lg font-semibold mb-3">Rincian Transaksi</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-1">Waktu</th>
                  <th className="text-left p-1">Tipe</th>
                  <th className="text-left p-1">Keterangan</th>
                  <th className="text-right p-1">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(item => {
                  const { time } = formatDateTime(item.created_at);
                   const isIncome = ['SALDO_AWAL', 'UANG_AWAL', 'SALDO_MASUK', 'UANG_MASUK'].includes(item.type);
                  return (
                    <tr key={item.id} className="border-b">
                      <td className="p-1">{time}</td>
                      <td className="p-1">{item.type.replace(/_/g, ' ')}</td>
                      <td className="p-1">{item.keterangan || '-'}</td>
                      <td className={`p-1 text-right font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                        Rp {item.nominal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
    </div>
);


const ArusSaldoTab = () => {
    const { arusSaldo, addArusSaldo, updateArusSaldo, deleteArusSaldo, loading } = useData();
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formState, setFormState] = useState({});
    const [editingItem, setEditingItem] = useState(null);
    const [formType, setFormType] = useState('');
    const [filterMode, setFilterMode] = useState('daily');
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [filterMonth, setFilterMonth] = useState(getThisMonth());
    const [isDownloading, setIsDownloading] = useState(false);
    const reportRef = useRef();

    const filteredArusSaldo = useMemo(() => {
        if (filterMode === 'daily') {
            return arusSaldo.filter(item => getLocalDateString(item.created_at) === selectedDate);
        }
        return arusSaldo.filter(item => item.created_at.startsWith(filterMonth));
    }, [arusSaldo, filterMode, selectedDate, filterMonth]);
    
    const handleInputChange = (e, field) => {
        const value = field === 'nominal' ? formatNumberInput(e.target.value) : e.target.value;
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setFormState({});
        setEditingItem(null);
        setFormType('');
    };

    const handleFormOpen = (type, item = null) => {
        setFormType(type);
        if (item) {
            setEditingItem(item);
            setFormState({
                nominal: formatNumberInput(String(item.nominal)),
                keterangan: item.keterangan || '',
            });
        } else {
            setFormState({});
        }
        setIsFormOpen(true);
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        resetForm();
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const dataForDb = {
            nominal: parseInt(parseFormattedNumber(formState.nominal || '0'), 10),
            keterangan: formState.keterangan || null,
        };

        let result;
        if (editingItem) {
            result = await updateArusSaldo(editingItem.id, dataForDb);
        } else {
            const dataToSubmit = { ...dataForDb, type: formType };
            result = await addArusSaldo(dataToSubmit);
        }

        if (result.success) {
            toast({ title: "Sukses", description: `Catatan berhasil di${editingItem ? 'perbarui' : 'tambahkan'}.` });
            handleFormClose();
        } else {
            toast({ variant: "destructive", title: "Gagal", description: result.error.message });
        }
    };

    const handleDelete = async (id) => {
        const result = await deleteArusSaldo(id);
        if (result.success) {
            toast({ title: "Sukses", description: "Catatan berhasil dihapus." });
        } else {
            toast({ variant: "destructive", title: "Gagal", description: result.error.message });
        }
    };

    const stats = useMemo(() => {
        const totals = filteredArusSaldo.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + item.nominal;
            return acc;
        }, {});

        const saldoAwal = totals['SALDO_AWAL'] || 0;
        const uangAwal = totals['UANG_AWAL'] || 0;
        const saldoMasuk = totals['SALDO_MASUK'] || 0;
        const saldoKeluar = totals['SALDO_KELUAR'] || 0;
        const uangMasuk = totals['UANG_MASUK'] || 0;
        const uangKeluar = totals['UANG_KELUAR'] || 0;

        return {
            saldoAwal,
            uangAwal,
            saldoMasuk,
            saldoKeluar,
            uangMasuk,
            uangKeluar,
            saldoAkhir: saldoAwal + saldoMasuk - saldoKeluar,
            uangAkhir: uangAwal + uangMasuk - uangKeluar,
        };
    }, [filteredArusSaldo]);

    const getFormTitle = () => {
        if (editingItem) return 'Edit Catatan';
        const titles = {
            'SALDO_AWAL': 'Tambah Saldo Awal', 'UANG_AWAL': 'Tambah Uang Awal',
            'SALDO_MASUK': 'Tambah Saldo Masuk', 'SALDO_KELUAR': 'Tambah Saldo Keluar',
            'UANG_MASUK': 'Tambah Uang Masuk', 'UANG_KELUAR': 'Tambah Uang Keluar',
        };
        return titles[formType] || 'Formulir Arus Saldo';
    };

    const handleDownloadPDF = async () => {
        if (filteredArusSaldo.length === 0) {
            toast({ variant: "destructive", title: "Tidak ada data untuk diunduh." });
            return;
        }
        setIsDownloading(true);

        if (filterMode === 'daily') {
            const reportElement = reportRef.current;
            const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            pdf.save(`laporan-arus-saldo-${selectedDate}.pdf`);
        } else {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(`Laporan Arus Saldo Bulanan: ${filterMonth}`, 14, 22);
    
            const sortedTransactions = [...filteredArusSaldo].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
            const groupedByDate = sortedTransactions.reduce((acc, item) => {
                const date = getLocalDateString(item.created_at);
                if (!acc[date]) acc[date] = [];
                acc[date].push(item);
                return acc;
            }, {});
    
            let yPos = 30;
            let carryOver = { saldo: 0, uang: 0 };
    
            Object.keys(groupedByDate).sort().forEach((date, index) => {
                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }
    
                if (index > 0) {
                    yPos += 2;
                    doc.setDrawColor(220, 220, 220);
                    doc.line(14, yPos, 196, yPos);
                    yPos += 8;
                }
    
                const dailyTransactions = groupedByDate[date];
                let opening = { ...carryOver };

                const dailySaldoAwal = dailyTransactions.filter(t => t.type === 'SALDO_AWAL').reduce((sum, t) => sum + t.nominal, 0);
                const dailyUangAwal = dailyTransactions.filter(t => t.type === 'UANG_AWAL').reduce((sum, t) => sum + t.nominal, 0);
                
                if (dailySaldoAwal > 0) {
                    opening.saldo = dailySaldoAwal;
                }
                if (dailyUangAwal > 0) {
                    opening.uang = dailyUangAwal;
                }
    
                const dailyTotals = dailyTransactions.reduce((acc, item) => {
                    const nominal = item.nominal || 0;
                    switch (item.type) {
                        case 'SALDO_MASUK': acc.saldoMasuk += nominal; break;
                        case 'SALDO_KELUAR': acc.saldoKeluar += nominal; break;
                        case 'UANG_MASUK': acc.uangMasuk += nominal; break;
                        case 'UANG_KELUAR': acc.uangKeluar += nominal; break;
                    }
                    return acc;
                }, { saldoMasuk: 0, saldoKeluar: 0, uangMasuk: 0, uangKeluar: 0 });

                const closing = {
                    saldo: opening.saldo + dailyTotals.saldoMasuk - dailyTotals.saldoKeluar,
                    uang: opening.uang + dailyTotals.uangMasuk - dailyTotals.uangKeluar
                };

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(formatDateTime(date).date, 14, yPos);
                yPos += 10;
    
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                let awalText = `Saldo Awal: Rp ${opening.saldo.toLocaleString('id-ID')} | Uang Awal: Rp ${opening.uang.toLocaleString('id-ID')}`;
                doc.text(awalText, 14, yPos);
                yPos += 7;
    
                autoTable(doc, {
                    startY: yPos,
                    head: [['WAKTU', 'TIPE', 'KETERANGAN', 'NOMINAL']],
                    body: dailyTransactions.map(item => {
                        const isIncome = ['SALDO_AWAL', 'UANG_AWAL', 'SALDO_MASUK', 'UANG_MASUK'].includes(item.type);
                        return [
                            formatDateTime(item.created_at).time,
                            item.type.replace(/_/g, ' '),
                            item.keterangan || '-',
                            {
                                content: `Rp ${item.nominal.toLocaleString('id-ID')}`,
                                styles: { halign: 'right', textColor: isIncome ? [6, 187, 82] : [243, 30, 30]}
                            }
                        ];
                    }),
                    theme: 'striped',
                    styles: { fontSize: 8, cellPadding: 1.5 },
                    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
                });
                yPos = doc.lastAutoTable.finalY + 10;

                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                let akhirText = `Saldo Akhir: Rp ${closing.saldo.toLocaleString('id-ID')} | Uang Akhir: Rp ${closing.uang.toLocaleString('id-ID')}`;
                doc.text(akhirText, 14, yPos);
                
                yPos += 12;
                carryOver = { ...closing };
            });
    
            doc.save(`laporan-arus-saldo-${filterMonth}.pdf`);
        }
    
        setIsDownloading(false);
    };

    const getFilterInfo = () => {
        if (filterMode === 'daily') return `Laporan Harian: ${selectedDate}`;
        if (filterMode === 'monthly') return `Laporan Bulanan: ${filterMonth}`;
        return 'Laporan Semua Aktivitas';
    };

    return (
        <div className="space-y-4">
             <div style={{ position: 'absolute', left: '-9999px', zIndex: -1 }}>
                <div ref={reportRef}>
                    {filterMode === 'daily' && <ArusSaldoPDFReport stats={stats} transactions={filteredArusSaldo} filterInfo={getFilterInfo()} />}
                </div>
            </div>

            <section>
                <Card className="shadow-strong-pekat border-2 border-black">
                     <CardHeader className="flex-row items-center justify-between p-4"><CardTitle className="text-sm">Filter Data</CardTitle><Button onClick={handleDownloadPDF} disabled={isDownloading} size="sm" className="shadow-button-pekat border-black border-2 active:shadow-none text-xs"><Download className="mr-2 h-4 w-4"/>{isDownloading ? 'Mengunduh...' : 'Unduh'}</Button></CardHeader>
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center"><div className="flex gap-2"><Button size="sm" variant={filterMode === 'monthly' ? 'default' : 'outline'} onClick={() => setFilterMode('monthly')}>Bulanan</Button><Button size="sm" variant={filterMode === 'daily' ? 'default' : 'outline'} onClick={() => setFilterMode('daily')}>Harian</Button></div><div className="flex-1 w-full">{filterMode === 'daily' && (<Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />)}{filterMode === 'monthly' && (<Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />)}</div></CardContent>
                </Card>
            </section>

             <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button onClick={() => handleFormOpen('SALDO_AWAL')}>+ Saldo Awal</Button>
                <Button onClick={() => handleFormOpen('UANG_AWAL')}>+ Uang Awal</Button>
                <Button onClick={() => handleFormOpen('SALDO_MASUK')}>+ Saldo Masuk</Button>
                <Button onClick={() => handleFormOpen('SALDO_KELUAR')}>- Saldo Keluar</Button>
                <Button onClick={() => handleFormOpen('UANG_MASUK')}>+ Uang Masuk</Button>
                <Button onClick={() => handleFormOpen('UANG_KELUAR')}>- Uang Keluar</Button>
            </section>

            <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Saldo Awal" value={stats.saldoAwal} />
                <StatCard title="Uang Awal" value={stats.uangAwal} />
                <StatCard title="Saldo Masuk" value={stats.saldoMasuk} />
                <StatCard title="Saldo Keluar" value={-stats.saldoKeluar} />
                <StatCard title="Uang Masuk" value={stats.uangMasuk} />
                <StatCard title="Uang Keluar" value={-stats.uangKeluar} />
                <StatCard title="Saldo Akhir" value={stats.saldoAkhir} className="bg-blue-100 dark:bg-blue-900" />
                <StatCard title="Uang Akhir" value={stats.uangAkhir} className="bg-green-100 dark:bg-green-900" />
            </section>

            <section>
                <h2 className="text-lg font-bold mb-2">Riwayat Arus Saldo</h2>
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Tipe</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead className="text-right">Nominal</TableHead>
                                <TableHead className="text-right">Opsi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan="5" className="text-center">Memuat...</TableCell></TableRow>
                            ) : filteredArusSaldo.length > 0 ? (
                                filteredArusSaldo.map(item => {
                                    const { date, time } = formatDateTime(item.created_at);
                                    const isIncome = ['SALDO_AWAL', 'UANG_AWAL', 'SALDO_MASUK', 'UANG_MASUK'].includes(item.type);
                                    return (
                                    <TableRow key={item.id}>
                                        <TableCell>{date} <span className="text-xs text-muted-foreground">{time}</span></TableCell>
                                        <TableCell>{item.type.replace(/_/g, ' ')}</TableCell>
                                        <TableCell>{item.keterangan || '-'}</TableCell>
                                        <TableCell className={`text-right font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                           Rp {item.nominal.toLocaleString('id-ID')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFormOpen(item.type, item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4 text-red-600"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Yakin hapus?</AlertDialogTitle></AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(item.id)}>Hapus</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )})
                            ) : (
                                <TableRow><TableCell colSpan="5" className="text-center">Belum ada data.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </section>

            <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{getFormTitle()}</DialogTitle></DialogHeader>
                    <form id="arus-saldo-form" className="space-y-4" onSubmit={handleFormSubmit}>
                        <div>
                            <label className="text-sm font-medium">Nominal</label>
                            <Input placeholder="Jumlah Nominal" value={formState.nominal || ''} onChange={(e) => handleInputChange(e, 'nominal')} required/>
                        </div>
                         <div>
                            <label className="text-sm font-medium">Keterangan</label>
                            <Textarea placeholder="Keterangan (opsional)" value={formState.keterangan || ''} onChange={(e) => handleInputChange(e, 'keterangan')} />
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleFormClose}>Batal</Button>
                        <Button type="submit" form="arus-saldo-form">Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ArusSaldoTab;
