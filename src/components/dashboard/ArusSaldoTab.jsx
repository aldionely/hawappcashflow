import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumberInput, parseFormattedNumber, formatDateTime } from '@/lib/utils';
import { Edit, Trash2 } from 'lucide-react';
import StatCard from './StatCard';

const ArusSaldoTab = () => {
    const { arusSaldo, addArusSaldo, updateArusSaldo, deleteArusSaldo, loading } = useData();
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formState, setFormState] = useState({});
    const [editingItem, setEditingItem] = useState(null);
    const [formType, setFormType] = useState(''); 

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
            setFormState({}); // Reset form untuk entri baru
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
            // Saat mengedit, hanya perbarui nominal dan keterangan
            result = await updateArusSaldo(editingItem.id, dataForDb);
        } else {
            // Saat menambah data baru, tambahkan tipe dan waktu saat ini
            const dataToSubmit = {
                ...dataForDb,
                type: formType,
                created_at: new Date().toISOString(), // Jam diatur otomatis di sini
            };
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
        const totals = arusSaldo.reduce((acc, item) => {
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
    }, [arusSaldo]);

    const getFormTitle = () => {
        if (editingItem) return 'Edit Catatan';
        const titles = {
            'SALDO_AWAL': 'Tambah Saldo Awal', 'UANG_AWAL': 'Tambah Uang Awal',
            'SALDO_MASUK': 'Tambah Saldo Masuk', 'SALDO_KELUAR': 'Tambah Saldo Keluar',
            'UANG_MASUK': 'Tambah Uang Masuk', 'UANG_KELUAR': 'Tambah Uang Keluar',
        };
        return titles[formType] || 'Formulir Arus Saldo';
    };

    return (
        <div className="space-y-4">
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
                            ) : arusSaldo.length > 0 ? (
                                arusSaldo.map(item => {
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
                        {/* Input Tanggal & Jam telah dihapus dari sini */}
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