import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { handleSupabaseError } from "@/lib/errorHandler";

// API Service Functions (diletakkan di sini untuk kesederhanaan)
const fetchFinancialsAPI = async () => {
  const { data, error } = await supabase.from('daily_financials').select('*').order('shift_date', { ascending: false });
  if (error) return { success: false, error: handleSupabaseError(error, "fetching financials") };
  return { success: true, data: data || [] };
};

const addFinancialRecordAPI = async (recordData) => {
  const { data, error } = await supabase.from('daily_financials').insert([recordData]).select();
  if (error) return { success: false, error: handleSupabaseError(error, "adding financial record") };
  return { success: true, data: data ? data[0] : null };
};


// Create Context
const DataContext = createContext(null);

// Create Provider Component
export const DataProvider = ({ children }) => {
    const [financials, setFinancials] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFinancials = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchFinancialsAPI();
            if (result.success) {
                setFinancials(result.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const addFinancialRecord = async (data) => {
        const result = await addFinancialRecordAPI(data);
        if (result.success) {
            await fetchFinancials(); 
        }
        return result;
    };

    // Panggil fetchFinancials saat komponen pertama kali dimuat
    useEffect(() => {
        fetchFinancials();
    }, [fetchFinancials]);

    const value = useMemo(() => ({
        financials,
        loading,
        fetchFinancials,
        addFinancialRecord
    }), [financials, loading, fetchFinancials]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

// Custom Hook untuk menggunakan context
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};