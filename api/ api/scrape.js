import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Content-Type', 'application/json');
  
  const { cardName } = req.query;
  
  if (!cardName) {
    return res.status(400).json({ ok: false, error: '카드 이름이 필요해요' });
  }
  
  try {
    const query = encodeURIComponent(`포켓몬카드 ${cardName}`);
    const url = `https://search.shopping.naver.com/search/all?query=${query}&sort=review`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items = [];
    const products = $('div[data-product-id]').slice(0, 5);
    
    products.each((i, el) => {
      const title = $(el).find('a[class*="title"]').text().trim();
      const priceText = $(el).find('span[class*="price"]').first().text();
      const linkEl = $(el).find('a[class*="link"]').first();
      const link = linkEl.attr('href');
      
      const price = priceText.replace(/[^\d,]/g, '').replace(',', '');
      
      if (title && price) {
        items.push({
          title: title.substring(0, 60),
          price: parseInt(price) || null,
          priceDisplay: priceText,
          link: link ? `https://shopping.naver.com${link}` : null
        });
      }
    });
    
    if (items.length === 0) {
      return res.json({
        ok: false,
        message: '검색 결과가 없어요',
        searchUrl: `https://search.shopping.naver.com/search/all?query=${query}`
      });
    }
    
    const prices = items.map(i => i.price).filter(p => p);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b) / prices.length);
    
    return res.json({
      ok: true,
      cardName,
      items,
      stats: {
        minPrice,
        maxPrice,
        avgPrice,
        count: items.length
      },
      searchUrl: `https://search.shopping.naver.com/search/all?query=${query}`
    });
    
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || '크롤링 중 오류 발생'
    });
  }
}
