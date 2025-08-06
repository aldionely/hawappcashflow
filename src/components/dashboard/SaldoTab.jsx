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

export default SaldoTab;
