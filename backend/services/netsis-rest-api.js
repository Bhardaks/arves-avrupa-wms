// =====================================================
// NETSIS REST API ENTEGRASYON MODÜLÜ
// =====================================================

const axios = require('axios');

// Netsis konfigürasyon - çalışan değerleri kullan
function getNetsisConfig() {
  console.log('🔧 DEBUG - Global netsisConfig check:', {
    exists: !!global.netsisConfig,
    keys: global.netsisConfig ? Object.keys(global.netsisConfig) : 'none',
    baseURL: global.netsisConfig ? global.netsisConfig.baseURL : 'missing'
  });
  
  // Admin panelden çalışan ayarları kullan (loglardan alındı)
  return {
    baseURL: 'http://93.89.67.130:2626',
    username: 'NETSIS',
    password: '141',
    company: 'ARVESAVRUPA',
    branch: 0,
    dbUser: 'TEMELSET',
    dbPassword: '',
    dbType: 1 // vtMSSQL
  };
}

let netsisToken = null;
let tokenExpiry = null;

/**
 * Netsis'ten OAuth2 token alır
 */
async function getNetsisToken() {
  // Eğer mevcut token var ve süresi dolmamışsa, onu kullan
  if (netsisToken && tokenExpiry && new Date() < tokenExpiry) {
    console.log('🔐 Using existing Netsis token');
    return netsisToken;
  }
  
  try {
    console.log('🔐 Getting new Netsis token...');
    
    const NETSIS_CONFIG = getNetsisConfig(); // Dinamik config al
    
    const tokenEndpoints = [
      '/api/v2/token',
      '/token', 
      '/api/token'
    ];
    
    for (const endpoint of tokenEndpoints) {
      try {
        const url = NETSIS_CONFIG.baseURL + endpoint;
        console.log(`🔐 Trying token endpoint: ${url}`);
        
        const requestData = new URLSearchParams();
        requestData.append('grant_type', 'password');
        requestData.append('username', NETSIS_CONFIG.username);
        requestData.append('password', NETSIS_CONFIG.password);
        requestData.append('branchcode', NETSIS_CONFIG.branch);
        requestData.append('dbname', NETSIS_CONFIG.company);
        requestData.append('dbuser', NETSIS_CONFIG.dbUser);
        requestData.append('dbpassword', NETSIS_CONFIG.dbPassword);
        requestData.append('dbtype', NETSIS_CONFIG.dbType);
        
        const response = await axios.post(url, requestData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'WMS-Netsis-Integration/1.0',
            'Cache-Control': 'no-cache'
          },
          timeout: 30000
        });
        
        const data = response.data;
        
        if (response.status === 200 && data.access_token) {
          console.log('✅ Netsis token başarıyla alındı');
          netsisToken = data.access_token;
          
          // Token süresini hesapla (varsayılan 1 saat)
          const expiresIn = data.expires_in || 3600;
          tokenExpiry = new Date(Date.now() + (expiresIn * 1000));
          
          return netsisToken;
        } else {
          console.warn(`⚠️ Token endpoint failed: ${endpoint}`, data);
          if (data.error_description) {
            throw new Error(`Netsis hatası: ${data.error_description}`);
          }
        }
      } catch (endpointError) {
        console.warn(`⚠️ Token endpoint error: ${endpoint}`, endpointError.message);
      }
    }
    
    throw new Error('Tüm Netsis token endpoint\'leri başarısız');
    
  } catch (error) {
    console.error('❌ Netsis token alma hatası:', error);
    netsisToken = null;
    tokenExpiry = null;
    throw error;
  }
}

/**
 * Sipariş verisini Netsis irsaliye formatına çevirir
 */
function convertOrderToDispatch(orderData, orderItems) {
  console.log('🔄 Converting order to dispatch format:', orderData);
  
  // Sipariş kalemlerini kontrol et
  if (!orderItems || orderItems.length === 0) {
    throw new Error('Sipariş kalemleri bulunamadı');
  }
  
  // Müşteri kodu kontrol et
  const customerCode = orderData.customer_code || orderData.customer_name;
  if (!customerCode) {
    throw new Error('Müşteri kodu bulunamadı');
  }
  
  // Toplam tutarları hesapla
  let totalNet = 0;
  let totalVat = 0;
  
  // Satır kalemlerini dönüştür
  const lines = orderItems.map((item, index) => {
    const quantity = parseFloat(item.picked_qty || item.quantity || 1);
    const unitPrice = parseFloat(item.unit_price || 0);
    const vatRate = 0; // Belçika için genelde 0%
    
    const lineNet = quantity * unitPrice;
    const lineVat = lineNet * (vatRate / 100);
    
    totalNet += lineNet;
    totalVat += lineVat;
    
    return {
      STOCK_CODE: item.product_sku || item.sku,
      QUANTITY: quantity,
      UNIT_CODE: 'ADET',
      PRICE: unitPrice,
      VAT_RATE: vatRate,
      WAREHOUSE: 2, // Varsayılan depo
      ORDER_REFERENCE: orderData.order_number,
      LINE_NO: index + 1,
      DESCRIPTION: item.product_name || item.name || item.product_sku
    };
  });
  
  const totalGross = totalNet + totalVat;
  
  // Ana irsaliye verisi
  const dispatchData = {
    FTIRSIP: 3, // Satış İrsaliyesi
    FICHE_NO: '', // Boş bırakarak otomatik numara al
    DATE: new Date().toISOString().split('T')[0], // Bugünün tarihi (YYYY-MM-DD)
    ARP_CODE: customerCode.toString().trim(),
    DOC_NUMBER: `WMS-${orderData.order_number}`, // WMS referansı
    TOTAL_GROSS: totalGross,
    TOTAL_NET: totalNet,
    VAT_TOTAL: totalVat,
    NOTES: `WMS Sipariş: ${orderData.order_number}`,
    BRANCH_CODE: getNetsisConfig().branch,
    LINES: lines
  };
  
  console.log('✅ Dispatch data converted:', dispatchData);
  return dispatchData;
}

/**
 * Netsis API'ye irsaliye gönderir
 */
async function createNetsisDispatch(dispatchData, token) {
  console.log('📤 Sending dispatch to Netsis:', dispatchData);
  
  try {
    const dispatchEndpoints = [
      '/api/v2/Dispatches',
      '/api/v2/Invoices', 
      '/api/v2/SalesDispatches',
      '/api/v2/Faturas'
    ];
    
    for (const endpoint of dispatchEndpoints) {
      try {
        const url = getNetsisConfig().baseURL + endpoint;
        console.log(`📤 Trying dispatch endpoint: ${url}`);
        
        const response = await axios.post(url, dispatchData, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'WMS-Netsis-Integration/1.0'
          },
          timeout: 60000
        });
        
        const result = response.data;
        
        if (response.status === 200 && result) {
          console.log('✅ Netsis dispatch created successfully:', result);
          
          return {
            success: true,
            dispatchId: result.ID || result.id || result.FICHE_NO || result.fiche_no,
            dispatchNumber: result.FICHE_NO || result.fiche_no || result.NUMBER || result.number,
            result: result
          };
        } else {
          console.warn(`⚠️ Dispatch endpoint failed: ${endpoint}`, result);
        }
      } catch (endpointError) {
        console.warn(`⚠️ Dispatch endpoint error: ${endpoint}`, endpointError.message);
      }
    }
    
    throw new Error('Tüm Netsis dispatch endpoint\'leri başarısız');
    
  } catch (error) {
    console.error('❌ Netsis dispatch creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ana irsaliye oluşturma fonksiyonu
 */
async function createDispatchNote(orderData, orderItems) {
  try {
    console.log('🚀 Starting Netsis REST API dispatch creation...');
    
    // 1. Token al
    const token = await getNetsisToken();
    
    // 2. Veri dönüştür
    const dispatchData = convertOrderToDispatch(orderData, orderItems);
    
    // 3. Netsis'e gönder
    const result = await createNetsisDispatch(dispatchData, token);
    
    return result;
    
  } catch (error) {
    console.error('❌ Dispatch note creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getNetsisToken,
  convertOrderToDispatch,
  createNetsisDispatch,
  createDispatchNote,
  getNetsisConfig
};