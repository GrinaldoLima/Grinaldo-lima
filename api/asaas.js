// Vercel Serverless Function — /api/asaas
// Mantém a chave do Asaas em segredo no servidor (nunca fica visível no navegador).
// Configuração necessária no Vercel: Settings -> Environment Variables -> ASAAS_API_KEY

module.exports = async (req, res) => {
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'ASAAS_API_KEY não foi configurada nas variáveis de ambiente do Vercel.' });
    return;
  }

  const baseUrl = 'https://api.asaas.com/v3';

  try {
    // Busca as cobranças mais recentes (até 100 por chamada)
    const paymentsResp = await fetch(baseUrl + '/payments?limit=100&order=desc', {
      headers: { 'access_token': apiKey }
    });

    if (!paymentsResp.ok) {
      const detail = await paymentsResp.text();
      res.status(paymentsResp.status).json({ error: 'Erro ao consultar cobranças no Asaas.', detail });
      return;
    }
    const paymentsData = await paymentsResp.json();

    // Busca clientes do Asaas para trazer o nome junto de cada cobrança
    let customerMap = {};
    try {
      const customersResp = await fetch(baseUrl + '/customers?limit=100', {
        headers: { 'access_token': apiKey }
      });
      if (customersResp.ok) {
        const customersData = await customersResp.json();
        (customersData.data || []).forEach(c => {
          customerMap[c.id] = { name: c.name, cpfCnpj: c.cpfCnpj };
        });
      }
    } catch (e) { /* segue sem os nomes se falhar */ }

    const payments = (paymentsData.data || []).map(p => ({
      id: p.id,
      value: p.value,
      dueDate: p.dueDate,
      paymentDate: p.paymentDate || p.clientPaymentDate || null,
      status: p.status,
      billingType: p.billingType,
      description: p.description || '',
      customerId: p.customer,
      customerName: customerMap[p.customer] ? customerMap[p.customer].name : (p.customer || 'Cliente Asaas'),
      customerCpfCnpj: customerMap[p.customer] ? customerMap[p.customer].cpfCnpj : null
    }));

    res.status(200).json({ payments, total: paymentsData.totalCount || payments.length });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao conectar com a API do Asaas.', detail: String(e) });
  }
};
