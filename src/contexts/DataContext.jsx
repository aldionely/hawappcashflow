import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { handleSupabaseError } from "@/lib/errorHandler";

// API Service Functions
const fetchTransactionsAPI = async () => {
  const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
  if (error) return { success: false, error: handleSupabaseError(error, "fetching transactions") };
  return { success: true, data: data || [] };
};

const addTransactionsAPI = async (transactionArray) => {
  const { data, error } = await supabase.from('transactions').insert(transactionArray).select();
  if (error) return { success: false, error: handleSupabaseError(error, "adding transactions") };
  return { success: true, data: data || [] };
};

const deleteTransactionGroupAPI = async (groupId) => {
  const { error } = await supabase.from('transactions').delete().eq('group_id', groupId);
  if (error) return { success: false, error: handleSupabaseError(error, "deleting transaction group") };
  return { success: true };
};


// Create Context
const DataContext = createContext(null);

// Create Provider Component
export const DataProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchTransactionsAPI();
            if (result.success) {
                setTransactions(result.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const addTransactions = async (data) => {
        const result = await addTransactionsAPI(data);
        if (result.success) {
            await fetchTransactions(); 
        }
        return result;
    };

    const deleteTransactionGroup = async (groupId) => {
        const result = await deleteTransactionGroupAPI(groupId);
        if (result.success) {
            await fetchTransactions();
        }
        return result;
    };


    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const value = useMemo(() => ({
        transactions,
        loading,
        fetchTransactions,
        addTransactions,
        deleteTransactionGroup,
    }), [transactions, loading, fetchTransactions]);

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