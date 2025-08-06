import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const StatCard = ({ title, value, icon, className }) => (
    <Card className={cn("shadow-strong-pekat border-2 border-black", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
            <CardTitle className="text-xs font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold">Rp {Number(value).toLocaleString('id-ID')}</div>
        </CardContent>
    </Card>
);

export default StatCard;