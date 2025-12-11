import { db } from '../config/firebase.js';
import { PLANES_SAAS, obtenerPlan, obtenerTodosLosPlanes } from '../config/planesSaaS.js';

// ========================================
// CONTROLADOR DE FINANZAS SAAS (SUPER ADMIN)
// ========================================

/**
 * GET /api/finanzas/saas/overview
 * Obtiene el overview financiero del negocio SaaS
 */
export const getOverview = async (req, res) => {
    try {
        const { dateRange = '30' } = req.query; // 7, 30, 90 días

        // Calcular fechas
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - parseInt(dateRange));

        // 1. Obtener todas las empresas activas
        const empresasSnapshot = await db.collection('companies')
            .where('active', '==', true)
            .get();

        const empresasActivas = empresasSnapshot.size;

        // 2. Calcular MRR (Monthly Recurring Revenue)
        let mrrTotal = 0;
        const empresasPorPlan = {
            enterprise: { count: 0, mrr: 0 },
            professional: { count: 0, mrr: 0 },
            basic: { count: 0, mrr: 0 }
        };

        // Precios de los planes (deben venir de configuración o DB)
        const preciosPlanes = {
            enterprise: 1000,
            professional: 400,
            basic: 300
        };

        empresasSnapshot.forEach(doc => {
            const empresa = doc.data();
            const plan = empresa.plan?.toLowerCase() || 'basic';
            const precio = preciosPlanes[plan] || preciosPlanes.basic;

            mrrTotal += precio;
            if (empresasPorPlan[plan]) {
                empresasPorPlan[plan].count++;
                empresasPorPlan[plan].mrr += precio;
            } else if (empresasPorPlan['basic']) {
                // Fallback a basic si el plan no coincide
                empresasPorPlan['basic'].count++;
                empresasPorPlan['basic'].mrr += precio;
            }
        });

        // 3. Calcular ARR (Annual Recurring Revenue)
        const arr = mrrTotal * 12;

        // 4. Obtener facturas generadas por el servicio SaaS (facturas a las empresas)
        // Nota: Usamos 'saas_invoices' o similar. Si no existe, usamos mock o colección futura.
        // Por ahora simularemos con una colección 'saas_invoices' si existe, o 0.
        let facturasGeneradas = 0;
        try {
            const facturasSnapshot = await db.collection('saas_invoices')
                .where('createdAt', '>=', startDate)
                .get();
            facturasGeneradas = facturasSnapshot.size;
        } catch (e) {
            console.warn('Colección saas_invoices no existe aún, retornando 0');
        }

        // 5. Calcular cambios vs mes anterior (mock por ahora - implementar lógica real)
        const cambios = {
            mrr: 15.3,
            empresasActivas: 8.5,
            facturasGeneradas: 12.0,
            arr: 18.2
        };

        res.json({
            success: true,
            data: {
                mrr: {
                    total: mrrTotal,
                    change: cambios.mrr
                },
                empresasActivas: {
                    total: empresasActivas,
                    change: cambios.empresasActivas
                },
                facturasGeneradas: {
                    total: facturasGeneradas,
                    change: cambios.facturasGeneradas
                },
                arr: {
                    total: arr,
                    change: cambios.arr
                },
                empresasPorPlan: Object.entries(empresasPorPlan).map(([plan, data]) => ({
                    plan: plan.charAt(0).toUpperCase() + plan.slice(1),
                    count: data.count,
                    mrr: data.mrr
                }))
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener overview SaaS:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos financieros SaaS',
            error: error.message
        });
    }
};

/**
 * GET /api/finanzas/saas/empresas
 * Obtiene lista de empresas suscritas con sus métricas
 */
export const getEmpresasSuscritas = async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;

        const empresasSnapshot = await db.collection('companies')
            .where('active', '==', true)
            // .orderBy('createdAt', 'desc') // Requiere índice compuesto si se usa con where
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .get();

        const empresas = [];
        const preciosPlanes = {
            enterprise: 1000,
            professional: 400,
            basic: 300
        };

        for (const doc of empresasSnapshot.docs) {
            const empresa = doc.data();
            const plan = empresa.plan?.toLowerCase() || 'basic';

            empresas.push({
                id: doc.id,
                nombre: empresa.name || empresa.nombre || 'Sin Nombre',
                plan: empresa.plan || 'Basic',
                mrr: preciosPlanes[plan] || preciosPlanes.basic,
                fechaSuscripcion: empresa.createdAt?.toDate() || new Date(),
                estado: empresa.active ? 'activo' : 'inactivo',
                contacto: empresa.contactEmail || empresa.email || ''
            });
        }

        res.json({
            success: true,
            data: empresas,
            total: empresasSnapshot.size
        });

    } catch (error) {
        console.error('❌ Error al obtener empresas suscritas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener empresas suscritas',
            error: error.message
        });
    }
};

/**
 * GET /api/finanzas/saas/metricas-mensuales
 * Obtiene métricas mensuales para gráficos
 */
export const getMetricasMensuales = async (req, res) => {
    try {
        const { meses = 6 } = req.query;

        // Generar datos de los últimos N meses
        const metricas = [];
        const now = new Date();

        for (let i = parseInt(meses) - 1; i >= 0; i--) {
            const fecha = new Date(now);
            fecha.setMonth(fecha.getMonth() - i);

            // TODO: Implementar cálculo real desde Firestore
            // Por ahora datos mock con crecimiento progresivo para demo
            const baseRevenue = 10000 + (i * 500);

            metricas.push({
                mes: fecha.toLocaleString('es-DO', { month: 'short', year: 'numeric' }),
                fecha: fecha.toISOString(),
                mrr: baseRevenue + Math.random() * 1000,
                empresasNuevas: Math.floor(Math.random() * 5) + 1,
                churn: Math.floor(Math.random() * 2)
            });
        }

        res.json({
            success: true,
            data: metricas
        });

    } catch (error) {
        console.error('❌ Error al obtener métricas mensuales:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener métricas mensuales',
            error: error.message
        });
    }
};

/**
 * GET /api/finanzas/saas/planes
 * Obtiene todos los planes SaaS configurados con precios actuales
 */
export const getPlanes = async (req, res) => {
    try {
        const planes = obtenerTodosLosPlanes();

        res.json({
            success: true,
            data: {
                planes,
                moneda: 'RD$',
                tasaCambio: 58.5
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener planes SaaS:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener planes SaaS',
            error: error.message
        });
    }
};

/**
 * PUT /api/finanzas/saas/planes/:planId
 * Actualiza precio o características de un plan SaaS (solo Super Admin)
 */
export const actualizarPlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const { precio, precioUSD, caracteristicas, limites } = req.body;

        // Verificar que el plan existe
        const planActual = obtenerPlan(planId);
        if (!planActual) {
            return res.status(404).json({
                success: false,
                message: `Plan '${planId}' no encontrado`
            });
        }

        // Guardar cambios en colección de configuración
        const configRef = db.collection('config').doc('planes_saas');
        const configDoc = await configRef.get();

        let planesCustomizados = {};
        if (configDoc.exists) {
            planesCustomizados = configDoc.data().planes || {};
        }

        // Actualizar solo los campos enviados
        planesCustomizados[planId] = {
            ...planActual,
            ...(precio && { precio }),
            ...(precioUSD && { precioUSD }),
            ...(caracteristicas && { caracteristicas }),
            ...(limites && { limites }),
            actualizadoAt: new Date(),
            actualizadoPor: req.userData.email
        };

        await configRef.set({
            planes: planesCustomizados,
            actualizadoAt: new Date()
        }, { merge: true });

        console.log(`✅ Plan '${planId}' actualizado por ${req.userData.email}`);

        res.json({
            success: true,
            message: `Plan '${planActual.nombre}' actualizado exitosamente`,
            data: planesCustomizados[planId]
        });

    } catch (error) {
        console.error('❌ Error al actualizar plan:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar plan',
            error: error.message
        });
    }
};

/**
 * POST /api/finanzas/saas/generar-factura/:companyId
 * Genera factura mensual de suscripción SaaS para una empresa
 */
export const generarFacturaSuscripcion = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { mes, anio, observaciones } = req.body;

        // 1. Obtener datos de la empresa
        const companyDoc = await db.collection('companies').doc(companyId).get();

        if (!companyDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        const companyData = companyDoc.data();
        const planId = companyData.plan || 'operativo';
        const plan = obtenerPlan(planId);

        if (!plan) {
            return res.status(400).json({
                success: false,
                message: `Plan '${planId}' no configurado`
            });
        }

        // 2. Verificar si ya existe factura para este mes
        const mesAnioKey = `${anio}-${String(mes).padStart(2, '0')}`;
        const facturaExistente = await db.collection('saas_invoices')
            .where('companyId', '==', companyId)
            .where('mesAnio', '==', mesAnioKey)
            .limit(1)
            .get();

        if (!facturaExistente.empty) {
            return res.status(400).json({
                success: false,
                message: `Ya existe una factura para ${mesAnioKey}`,
                data: { facturaId: facturaExistente.docs[0].id }
            });
        }

        // 3. Generar número de factura
        const numeroFactura = `SAAS-${anio}-${String(mes).padStart(2, '0')}-${companyId.substring(0, 8).toUpperCase()}`;

        // 4. Crear factura de suscripción
        const facturaSaas = {
            companyId,
            companyName: companyData.name || 'Sin Nombre',
            numeroFactura,
            tipo: 'suscripcion_saas',
            plan: planId,
            planNombre: plan.nombre,
            mesAnio: mesAnioKey,
            mes,
            anio,
            monto: plan.precio,
            montoUSD: plan.precioUSD,
            moneda: 'RD$',
            estado: 'pendiente', // pendiente, pagada, vencida
            fechaEmision: new Date(),
            fechaVencimiento: new Date(anio, mes, 15), // Vence el 15 del mes siguiente
            conceptos: [
                {
                    descripcion: `Suscripción ${plan.nombre} - ${getMesNombre(mes)} ${anio}`,
                    cantidad: 1,
                    precioUnitario: plan.precio,
                    total: plan.precio
                }
            ],
            observaciones: observaciones || '',
            createdAt: new Date(),
            createdBy: req.userData.email
        };

        const facturaRef = await db.collection('saas_invoices').add(facturaSaas);

        console.log(`✅ Factura SaaS generada: ${numeroFactura} para ${companyData.name}`);

        res.json({
            success: true,
            message: 'Factura de suscripción generada exitosamente',
            data: {
                facturaId: facturaRef.id,
                numeroFactura,
                monto: plan.precio,
                ...facturaSaas
            }
        });

    } catch (error) {
        console.error('❌ Error al generar factura SaaS:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar factura de suscripción',
            error: error.message
        });
    }
};

/**
 * POST /api/finanzas/saas/generar-facturas-masivas
 * Genera facturas de suscripción para todas las empresas activas del mes actual
 */
export const generarFacturasMasivas = async (req, res) => {
    try {
        const { mes, anio } = req.body;
        const mesActual = mes || new Date().getMonth() + 1;
        const anioActual = anio || new Date().getFullYear();

        // 1. Obtener todas las empresas activas
        const empresasSnapshot = await db.collection('companies')
            .where('active', '==', true)
            .get();

        const resultados = {
            exitosas: [],
            fallidas: [],
            duplicadas: []
        };

        // 2. Generar factura para cada empresa
        for (const doc of empresasSnapshot.docs) {
            const companyId = doc.id;
            const companyData = doc.data();
            const planId = companyData.plan || 'operativo';
            const plan = obtenerPlan(planId);

            if (!plan) {
                resultados.fallidas.push({
                    companyId,
                    companyName: companyData.name,
                    error: `Plan '${planId}' no configurado`
                });
                continue;
            }

            // Verificar si ya existe factura
            const mesAnioKey = `${anioActual}-${String(mesActual).padStart(2, '0')}`;
            const facturaExistente = await db.collection('saas_invoices')
                .where('companyId', '==', companyId)
                .where('mesAnio', '==', mesAnioKey)
                .limit(1)
                .get();

            if (!facturaExistente.empty) {
                resultados.duplicadas.push({
                    companyId,
                    companyName: companyData.name,
                    facturaId: facturaExistente.docs[0].id
                });
                continue;
            }

            // Crear factura
            try {
                const numeroFactura = `SAAS-${anioActual}-${String(mesActual).padStart(2, '0')}-${companyId.substring(0, 8).toUpperCase()}`;

                const facturaSaas = {
                    companyId,
                    companyName: companyData.name || 'Sin Nombre',
                    numeroFactura,
                    tipo: 'suscripcion_saas',
                    plan: planId,
                    planNombre: plan.nombre,
                    mesAnio: mesAnioKey,
                    mes: mesActual,
                    anio: anioActual,
                    monto: plan.precio,
                    montoUSD: plan.precioUSD,
                    moneda: 'RD$',
                    estado: 'pendiente',
                    fechaEmision: new Date(),
                    fechaVencimiento: new Date(anioActual, mesActual, 15),
                    conceptos: [
                        {
                            descripcion: `Suscripción ${plan.nombre} - ${getMesNombre(mesActual)} ${anioActual}`,
                            cantidad: 1,
                            precioUnitario: plan.precio,
                            total: plan.precio
                        }
                    ],
                    createdAt: new Date(),
                    createdBy: req.userData.email
                };

                const facturaRef = await db.collection('saas_invoices').add(facturaSaas);

                resultados.exitosas.push({
                    companyId,
                    companyName: companyData.name,
                    facturaId: facturaRef.id,
                    numeroFactura,
                    monto: plan.precio
                });

            } catch (error) {
                resultados.fallidas.push({
                    companyId,
                    companyName: companyData.name,
                    error: error.message
                });
            }
        }

        console.log(`✅ Generación masiva completada: ${resultados.exitosas.length} exitosas, ${resultados.fallidas.length} fallidas, ${resultados.duplicadas.length} duplicadas`);

        res.json({
            success: true,
            message: `Facturas generadas: ${resultados.exitosas.length} exitosas`,
            data: resultados
        });

    } catch (error) {
        console.error('❌ Error al generar facturas masivas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar facturas masivas',
            error: error.message
        });
    }
};

/**
 * GET /api/finanzas/saas/facturas
 * Obtiene facturas SaaS generadas
 */
export const getFacturasSaas = async (req, res) => {
    try {
        const { estado, mes, anio, limit = 50, offset = 0 } = req.query;

        let query = db.collection('saas_invoices');

        // Filtros
        if (estado) {
            query = query.where('estado', '==', estado);
        }

        if (mes && anio) {
            const mesAnioKey = `${anio}-${String(mes).padStart(2, '0')}`;
            query = query.where('mesAnio', '==', mesAnioKey);
        }

        // Ordenar y paginar
        const facturasSnapshot = await query
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .get();

        const facturas = facturasSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            fechaEmision: doc.data().fechaEmision?.toDate(),
            fechaVencimiento: doc.data().fechaVencimiento?.toDate(),
            createdAt: doc.data().createdAt?.toDate()
        }));

        res.json({
            success: true,
            data: facturas,
            total: facturasSnapshot.size
        });

    } catch (error) {
        console.error('❌ Error al obtener facturas SaaS:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener facturas SaaS',
            error: error.message
        });
    }
};

// Helper: Obtener nombre del mes en español
function getMesNombre(mes) {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || 'Mes Desconocido';
}
