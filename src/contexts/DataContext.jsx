import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { handleSupabaseError } from "@/lib/errorHandler";

// API Service Functions
const fetchFromTableAPI = async (tableName) => {
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
    if (error) return { success: false, error: handleSupabaseError(error, `fetching ${tableName}`) };
    return { success: true, data: data || [] };
};

const addRecordAPI = async (tableName, recordData) => {
    const { data, error } = await supabase.from(tableName).insert([recordData]).select();
    if (error) return { success: false, error: handleSupabaseError(error, `adding to ${tableName}`) };
    return { success: true, data: data ? data[0] : null };
};

const addMultipleRecordsAPI = async (tableName, records) => {
    const { data, error } = await supabase.from(tableName).insert(records).select();
    if (error) return { success: false, error: handleSupabaseError(error, `adding multiple to ${tableName}`) };
    return { success: true, data: data || [] };
};

const deleteRecordAPI = async (tableName, condition) => {
    const { error } = await supabase.from(tableName).delete().match(condition);
    if (error) return { success: false, error: handleSupabaseError(error, `deleting from ${tableName}`) };
    return { success: true };
};


// Create Context
const DataContext = createContext(null);

// Create Provider Component
export const DataProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [shiftActivities, setShiftActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [transactionsResult, shiftsResult, activitiesResult] = await Promise.all([
                fetchFromTableAPI('transactions'),
                fetchFromTableAPI('shifts'),
                fetchFromTableAPI('shift_activities')
            ]);
            if (transactionsResult.success) setTransactions(transactionsResult.data || []);
            if (shiftsResult.success) setShifts(shiftsResult.data || []);
            if (activitiesResult.success) setShiftActivities(activitiesResult.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const addTransactions = async (data) => {
        const result = await addMultipleRecordsAPI('transactions', data);
        if (result.success) await fetchAllData(); 
        return result;
    };

    const deleteTransactionGroup = async (groupId) => {
        const result = await deleteRecordAPI('transactions', { group_id: groupId });
        if (result.success) await fetchAllData();
        return result;
    };

    const addShift = async (data) => {
        const result = await addRecordAPI('shifts', data);
        if (result.success) await fetchAllData();
        return result;
    };

    const addShiftActivity = async (data) => {
        const result = await addRecordAPI('shift_activities', data);
        if (result.success) await fetchAllData();
        return result;
    }

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const value = useMemo(() => ({
        transactions,
        shifts,
        shiftActivities,
        loading,
        addTransactions,
        deleteTransactionGroup,
        addShift,
        addShiftActivity
    }), [transactions, shifts, shiftActivities, loading]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

// Custom Hook
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};