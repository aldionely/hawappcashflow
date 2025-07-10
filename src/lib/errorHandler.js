export const handleSupabaseError = (error, contextMessage) => {
    console.error(`Supabase Error in ${contextMessage}:`, error);
    
    let userFriendlyMessage = "Terjadi kesalahan pada server. Coba beberapa saat lagi.";
    let errorCode = null;
    let errorDetails = "";
  
    if (error) {
      if (typeof error.message === 'string' && error.message.includes("Failed to fetch")) {
        userFriendlyMessage = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
      } else if (error.message) {
        userFriendlyMessage = error.message; 
      }
      
      errorCode = error.code || null;
      errorDetails = error.details || (error.cause ? String(error.cause) : "");
      
      if (error.code === 'PGRST116') {
        userFriendlyMessage = "Data yang diminta tidak ditemukan atau tidak unik.";
      }
    }
  
    const formattedError = {
      message: userFriendlyMessage,
      details: errorDetails,
      hint: error?.hint || "",
      code: errorCode,
      originalError: error 
    };
    
    console.error("Formatted Supabase Error:", JSON.stringify(formattedError, null, 2));
    return formattedError;
  };