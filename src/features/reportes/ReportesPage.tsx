import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid,
  ToggleButtonGroup, ToggleButton, CircularProgress, Alert, Chip,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { listarProductos } from '../../api/productoApi';
import { listarVentas } from '../../api/ventaApi';
import type { ProductoResponse } from '../../types/producto';
import type { VentaResponse } from '../../types/venta';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';
const COLORES_PIE = [ACCENT, '#5B7FB8', '#8FADD4', '#BED0E8', '#D6E4F4'];

type Periodo = 'hoy' | 'semana' | 'mes';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getRango(periodo: Periodo): { desde: string; hasta: string } {
  const ahora = new Date();
  const hasta = ahora.toISOString().split('T')[0] + 'T23:59:59';
  if (periodo === 'hoy') {
    return { desde: ahora.toISOString().split('T')[0] + 'T00:00:00', hasta };
  }
  const dias = periodo === 'semana' ? 7 : 30;
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - dias + 1);
  return { desde: desde.toISOString().split('T')[0] + 'T00:00:00', hasta };
}

function agruparPorHora(ventas: VentaResponse[]) {
  const mapa: Record<number, number> = {};
  for (let h = 8; h <= 20; h++) mapa[h] = 0;
  ventas.forEach(v => {
    const h = new Date(v.fechaHora).getHours();
    if (h in mapa) mapa[h] += Number(v.total ?? 0);
  });
  return Object.entries(mapa).map(([h, total]) => ({ hora: `${h}h`, total }));
}

function agruparPorDia(ventas: VentaResponse[]) {
  const mapa: Record<string, number> = {};
  ventas.forEach(v => {
    const d = new Date(v.fechaHora);
    const key = d.toISOString().split('T')[0];
    mapa[key] = (mapa[key] ?? 0) + Number(v.total ?? 0);
  });
  return Object.entries(mapa)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, total]) => {
      const d = new Date(fecha + 'T12:00:00');
      return { dia: DIAS[d.getDay()], total };
    });
}

function calcularMediosPago(ventas: VentaResponse[]) {
  const mapa: Record<string, number> = {};
  ventas.forEach(v => {
    v.pagos?.forEach(p => {
      mapa[p.medio] = (mapa[p.medio] ?? 0) + Number(p.monto ?? 0);
    });
  });
  const total = Object.values(mapa).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  const LABELS: Record<string, string> = {
    EFECTIVO: 'Efectivo', DEBITO: 'Débito', CREDITO: 'Crédito',
    TRANSFERENCIA: 'Transferencia', CUENTA_CORRIENTE: 'Cta. Cte.',
  };
  return Object.entries(mapa)
    .sort(([, a], [, b]) => b - a)
    .map(([medio, monto]) => ({
      name: LABELS[medio] ?? medio,
      value: Math.round((monto / total) * 100),
    }));
}

function calcularTopProductos(ventas: VentaResponse[]) {
  const mapa: Record<string, { nombre: string; unidades: number; total: number }> = {};
  ventas.forEach(v => {
    v.items?.forEach(item => {
      if (!mapa[item.productoId]) {
        mapa[item.productoId] = { nombre: item.nombreProducto, unidades: 0, total: 0 };
      }
      mapa[item.productoId].unidades += item.cantidad;
      mapa[item.productoId].total += Number(item.subtotal ?? 0);
    });
  });
  const sorted = Object.values(mapa).sort((a, b) => b.total - a.total).slice(0, 5);
  const maxTotal = sorted[0]?.total ?? 1;
  return sorted.map(p => ({ ...p, pct: Math.round((p.total / maxTotal) * 100) }));
}

interface MetricaCardProps {
  label: string;
  value: string;
  delta?: number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

function MetricaCard({ label, value, delta, sub, icon, iconBg, iconColor }: MetricaCardProps) {
  return (
    <Card elevation={0} sx={{
      border: '1px solid #E3E1DB', borderRadius: 3, height: '100%',
      transition: 'box-shadow 0.2s, transform 0.2s',
      '&:hover': { boxShadow: '0 8px 32px rgba(59,91,140,0.12)', transform: 'translateY(-2px)' },
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: '#888780', letterSpacing: '0.2px' }}>
            {label}
          </Typography>
          <Box sx={{ bgcolor: iconBg, color: iconColor, borderRadius: 2, p: 0.75, display: 'flex' }}>
            {icon}
          </Box>
        </Box>
        <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: '#2C2C2A', lineHeight: 1, mb: 1 }}>
          {value}
        </Typography>
        {delta !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.25,
              bgcolor: delta >= 0 ? '#E8F5E9' : '#FFEBEE',
              borderRadius: 1, px: 0.75, py: 0.25,
            }}>
              {delta >= 0
                ? <TrendingUpIcon sx={{ fontSize: 13, color: '#2E7D32' }} />
                : <TrendingDownIcon sx={{ fontSize: 13, color: '#C62828' }} />
              }
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: delta >= 0 ? '#2E7D32' : '#C62828' }}>
                {delta >= 0 ? '+' : ''}{delta}%
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }}>vs período anterior</Typography>
          </Box>
        )}
        {sub && <Typography sx={{ fontSize: '0.78rem', color: '#B4B2A9', mt: 0.5 }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [ventas, setVentas] = useState<VentaResponse[]>([]);
  const [productosStockBajo, setProductosStockBajo] = useState<ProductoResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (p: Periodo) => {
    setLoading(true);
    setError(null);
    try {
      const { desde, hasta } = getRango(p);
      const [ventasRes, prodRes] = await Promise.all([
        listarVentas(desde, hasta, 0, 500),
        listarProductos(undefined, undefined, 0, 200),
      ]);
      setVentas(ventasRes.data.data.content.filter(v => v.estado === 'PAGADA'));
      setProductosStockBajo(prodRes.data.data.content.filter(p => p.stockBajo));
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void cargar(periodo); }, [periodo, cargar]);

  const totalVentas = ventas.reduce((acc, v) => acc + Number(v.total ?? 0), 0);
  const ticketPromedio = ventas.length > 0 ? Math.round(totalVentas / ventas.length) : 0;
  const graficoDatos: { hora?: string; dia?: string; total: number }[] =
  periodo === 'hoy' ? agruparPorHora(ventas) : agruparPorDia(ventas);
  const mediosPago = calcularMediosPago(ventas);
  const topProductos = calcularTopProductos(ventas);

  const formatMonto = (v: number) => `$${v.toLocaleString('es-AR')}`;

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
            Reportes
          </Typography>
          <Typography variant="body2" sx={{ color: '#888780', mt: 0.5 }}>
            Análisis de ventas y rendimiento del negocio
          </Typography>
        </Box>
        <ToggleButtonGroup value={periodo} exclusive onChange={(_, v) => v && setPeriodo(v)} size="small"
          sx={{
            bgcolor: '#F4F3F1', borderRadius: 2, p: 0.5, border: 'none',
            '& .MuiToggleButton-root': {
              px: 2, py: 0.75, fontSize: '0.875rem', textTransform: 'none',
              border: 'none', borderRadius: 1.5, color: '#888780', fontWeight: 500,
              '&.Mui-selected': { bgcolor: '#fff', color: ACCENT, fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
            },
          }}
        >
          <ToggleButton value="hoy">Hoy</ToggleButton>
          <ToggleButton value="semana">Semana</ToggleButton>
          <ToggleButton value="mes">Mes</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Métricas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricaCard
            label="Ventas totales"
            value={loading ? '...' : formatMonto(totalVentas)}
            icon={<BarChartOutlinedIcon sx={{ fontSize: 18 }} />}
            iconBg={ACCENT_BG} iconColor={ACCENT}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricaCard
            label="Transacciones"
            value={loading ? '...' : String(ventas.length)}
            icon={<ReceiptOutlinedIcon sx={{ fontSize: 18 }} />}
            iconBg="#E8F5E9" iconColor="#2E7D32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricaCard
            label="Ticket promedio"
            value={loading ? '...' : formatMonto(ticketPromedio)}
            sub={`${ventas.length} venta${ventas.length !== 1 ? 's' : ''} en el período`}
            icon={<ShoppingBagOutlinedIcon sx={{ fontSize: 18 }} />}
            iconBg="#FFF3E0" iconColor="#E65100"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricaCard
            label="Stock crítico"
            value={loading ? '...' : String(productosStockBajo.length)}
            sub="Productos bajo mínimo"
            icon={<WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />}
            iconBg={productosStockBajo.length > 0 ? '#FFEBEE' : '#E8F5E9'}
            iconColor={productosStockBajo.length > 0 ? '#C62828' : '#2E7D32'}
          />
        </Grid>
      </Grid>

      {/* Gráficos fila 1 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A' }}>
                    {periodo === 'hoy' ? 'Ventas por hora' : 'Ventas por día'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#888780', mt: 0.25 }}>
                    Total: {formatMonto(totalVentas)}
                  </Typography>
                </Box>
                <Chip label={`${ventas.length} transacciones`} size="small"
                  sx={{ bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 700, fontSize: '0.75rem', height: 22, borderRadius: 1.5, border: 'none' }} />
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={24} sx={{ color: ACCENT }} />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  {periodo === 'hoy' ? (
                    <AreaChart data={graficoDatos}>
                      <defs>
                        <linearGradient id="gradientAzul" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ACCENT} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hora" tick={{ fontSize: 12, fill: '#B4B2A9' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#B4B2A9' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip formatter={(v) => [`$${Number(v).toLocaleString('es-AR')}`, 'Ventas']}
                        contentStyle={{ border: '1px solid #E3E1DB', borderRadius: 10, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                      <Area type="monotone" dataKey="total" stroke={ACCENT} strokeWidth={2.5} fill="url(#gradientAzul)" dot={false} activeDot={{ r: 5, fill: ACCENT }} />
                    </AreaChart>
                  ) : (
                    <BarChart data={graficoDatos} barSize={32}>
                      <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#B4B2A9' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#B4B2A9' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip formatter={(v) => [`$${Number(v).toLocaleString('es-AR')}`, 'Ventas']}
                        contentStyle={{ border: '1px solid #E3E1DB', borderRadius: 10, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                        cursor={{ fill: ACCENT_BG }} />
                      <Bar dataKey="total" fill={ACCENT} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Medios de pago */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A', mb: 0.5 }}>Medios de pago</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#888780', mb: 1 }}>Distribución del período</Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} sx={{ color: ACCENT }} />
                </Box>
              ) : mediosPago.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
                  <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Sin datos</Typography>
                </Box>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={mediosPago} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                        dataKey="value" paddingAngle={3} strokeWidth={0}>
                        {mediosPago.map((_, i) => <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(v) => [`${Number(v)}%`, '']}
                        contentStyle={{ border: '1px solid #E3E1DB', borderRadius: 10, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
                    {mediosPago.map((mp, i) => (
                      <Box key={mp.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORES_PIE[i], flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.82rem', color: '#5F5E5A' }}>{mp.name}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 48, height: 4, bgcolor: '#F0EEE8', borderRadius: 2, overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${mp.value}%`, bgcolor: COLORES_PIE[i], borderRadius: 2 }} />
                          </Box>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#2C2C2A', minWidth: 28, textAlign: 'right' }}>
                            {mp.value}%
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fila 2 */}
      <Grid container spacing={2}>
        {/* Top productos */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A', mb: 2 }}>
                Productos más vendidos
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} sx={{ color: ACCENT }} />
                </Box>
              ) : topProductos.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
                  <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Sin ventas en el período</Typography>
                </Box>
              ) : topProductos.map((p, i) => (
                <Box key={p.nombre} sx={{ py: 1.25, borderBottom: i < topProductos.length - 1 ? '1px solid #F0EEE8' : 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: 1.5, bgcolor: i === 0 ? ACCENT : i === 1 ? '#5B7FB8' : '#F4F3F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: i < 2 ? '#fff' : '#888780' }}>{i + 1}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#2C2C2A' }}>{p.nombre}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }}>{p.unidades} unidades</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: ACCENT }}>{formatMonto(p.total)}</Typography>
                  </Box>
                  <Box sx={{ height: 4, bgcolor: '#F0EEE8', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', borderRadius: 2, width: `${p.pct}%`, bgcolor: i === 0 ? ACCENT : i === 1 ? '#5B7FB8' : '#D3D1C7', transition: 'width 0.5s ease' }} />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Stock crítico */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A' }}>Stock crítico</Typography>
                {productosStockBajo.length > 0 && (
                  <Chip label={`${productosStockBajo.length} productos`} size="small"
                    sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 700, fontSize: '0.72rem', height: 22, borderRadius: 1.5, border: 'none' }} />
                )}
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} sx={{ color: ACCENT }} />
                </Box>
              ) : productosStockBajo.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WarningAmberOutlinedIcon sx={{ fontSize: 24, color: '#2E7D32' }} />
                  </Box>
                  <Typography sx={{ color: '#2E7D32', fontWeight: 600, fontSize: '0.9rem' }}>Todo el stock está en orden</Typography>
                </Box>
              ) : productosStockBajo.map((p, i) => {
                const pct = Math.min((p.stockActual / p.stockMinimo) * 100, 100);
                const colorBarra = pct < 25 ? '#C62828' : pct < 50 ? '#F59E0B' : '#E65100';
                return (
                  <Box key={p.id} sx={{ py: 1.25, borderBottom: i < productosStockBajo.length - 1 ? '1px solid #F0EEE8' : 'none' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#2C2C2A' }}>{p.nombre}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#FFEBEE', borderRadius: 1.5, px: 1, py: 0.25 }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#C62828' }}>{p.stockActual}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: '#B4B2A9' }}>/ {p.stockMinimo} mín</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, height: 6, bgcolor: '#F0EEE8', borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: colorBarra, borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: colorBarra, minWidth: 32 }}>
                        {pct.toFixed(0)}%
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}