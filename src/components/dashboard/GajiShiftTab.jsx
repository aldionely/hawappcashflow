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

export default GajiShiftTab;