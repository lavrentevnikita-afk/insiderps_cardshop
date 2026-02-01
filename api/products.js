// Vercel Serverless Function для получения товаров
// Читает актуальные данные из GitHub репозитория

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/lavrentevnikita-afk/insiderps_cardshop/main/data/products.json';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Fetch products from GitHub
        const response = await fetch(GITHUB_RAW_URL, {
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        
        const products = await response.json();
        
        // Cache for 30 seconds
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
        
        return res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ 
            error: 'Failed to load products',
            message: error.message 
        });
    }
};
