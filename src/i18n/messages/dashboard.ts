export const dashboard = {
  es: {
    widgets: {
      devices: {
        title: 'Dispositivos Vinculados',
        online: 'En Línea',
        linked: 'Vinculados'
      },
      escoltas: {
        title: 'Personal de Escoltas',
        total: 'Total',
        disponible: 'Disponibles',
        enServicio: 'En Servicio',
        noDisponible: 'No Disponibles'
      },
      kilometers: {
        title: 'Kilómetros Recorridos',
        history: 'Histórico',
        today: 'Hoy',
        unit: 'KM'
      },
      services: {
        title: 'Gestión de Servicios',
        filter: {
          today: 'Hoy',
          week: 'Esta Sem',
          month: 'Mes'
        },
        executing: 'En Ejecución',
        scheduled: 'Programados',
        planned: 'Planeados',
        finished: 'Finalizados'
      },
      vehicles: {
        title: 'Control de Flota',
        searchPlaceholder: 'Buscar placa...',
        status: {
          onRoute: 'En Ruta',
          stoppedAlarm: 'Detenido - Alarma',
          workshop: 'Taller',
          onRouteAlarm: 'En Ruta - Alarma',
          inactive: 'Inactivo'
        }
      },
      alarms: {
        title: 'Alarmas Activas',
        cutoff: 'Corte 12:00',
        criticalAlerts: 'Alertas Críticas',
        attentionRequired: 'Requieren atención',
        alarmTypes: {
          overspeed: 'Exceso Vel.',
          sos: 'S.O.S Activo',
          routeDeviation: 'Alejamiento Ruta',
          lockOpen: 'Candado Abierto',
          lockClose: 'Candado Cerrado',
          routeReturn: 'Ruta en su lugar'
        }
      }
    },
    tacticalMap: {
      overspeed: 'Exceso de velocidad',
      sos: 'S.O.S Activo',
      routeDeviation: 'Alejamiento de ruta',
      lockOpen: 'Candado abierto',
      lockClose: 'Candado cerrado',
      routeReturn: 'Ruta en su lugar'
    },
    vortex: {
      tags: {
        critical: 'CRÍTICO',
        alert: 'ALERTA',
        control: 'CONTROL',
        status: 'ESTADO',
        system: 'SISTEMA',
        sos: 'SOS'
      }
    }
  },
  en: {
    widgets: {
      devices: {
        title: 'Linked Devices',
        online: 'Online',
        linked: 'Linked'
      },
      kilometers: {
        title: 'Kilometers Traveled',
        history: 'History',
        today: 'Today',
        unit: 'KM'
      },
      services: {
        title: 'Service Management',
        filter: {
          today: 'Today',
          week: 'This Week',
          month: 'Month'
        },
        executing: 'Executing',
        scheduled: 'Scheduled',
        planned: 'Planned',
        finished: 'Finished'
      },
      vehicles: {
        title: 'Fleet Control',
        searchPlaceholder: 'Search plate...',
        status: {
          onRoute: 'On Route',
          stoppedAlarm: 'Stopped - Alarm',
          workshop: 'Workshop',
          onRouteAlarm: 'On Route - Alarm',
          inactive: 'Inactive'
        }
      },
      alarms: {
        title: 'Active Alarms',
        cutoff: 'Cutoff 12:00',
        criticalAlerts: 'Critical Alerts',
        attentionRequired: 'Require attention',
        alarmTypes: {
          overspeed: 'Overspeed',
          sos: 'S.O.S Active',
          routeDeviation: 'Route Out',
          lockOpen: 'Lock Open'
        }
      }
    },
    tacticalMap: {
      overspeed: 'Speeding',
      sos: 'S.O.S Active',
      routeDeviation: 'Route Out',
      lockOpen: 'Lock Open'
    },
    vortex: {
      tags: {
        critical: 'CRITICAL',
        alert: 'ALERT',
        control: 'CONTROL',
        status: 'STATUS',
        system: 'SYSTEM',
        sos: 'SOS'
      }
    }
  }
}
