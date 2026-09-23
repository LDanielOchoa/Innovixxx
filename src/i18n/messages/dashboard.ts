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
          routeReturn: 'Retorno Ruta'
        }
      }
    },
    tacticalMap: {
      overspeed: 'Exceso de velocidad',
      sos: 'S.O.S Activo',
      routeDeviation: 'Alejamiento de ruta',
      lockOpen: 'Candado abierto',
      lockClose: 'Candado cerrado',
      routeReturn: 'Retorno Ruta'
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
    },
    solveAlarm: {
      title: 'Solventar Alerta de Seguridad',
      mapTitle: 'Ubicación de Alarma: {type}',
      back: 'Volver',
      openInMaps: 'Abrir en Maps',
      loadingMap: 'Cargando mapa...',
      viewMap: 'Ver mapa',
      comment: 'Comentario',
      commentPlaceholder: 'Escriba el motivo o comentario de la resolución...',
      commentRequired: 'El comentario es obligatorio para solventar la alarma.',
      commentRequiredToast: 'Por favor, ingrese un comentario o justificación.',
      commentRequiredSummary: 'Comentario requerido',
      visibility: 'Visibilidad:',
      visible: 'Visible',
      hidden: 'No Visible',
      solveBtn: 'Solventar Alarma',
      solvingBtn: 'Solventando...',
      successToast: 'Alarma solventada correctamente',
      errorToast: 'No se pudo solventar la alarma',
      networkErrorToast: 'Error de conexión al solventar la alerta',
      hardwareLabel: 'Hardware:'
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
          routeDeviation: 'Route Deviation',
          lockOpen: 'Lock Open',
          lockClose: 'Lock Closed',
          routeReturn: 'Route Return'
        }
      }
    },
    tacticalMap: {
      overspeed: 'Speeding',
      sos: 'S.O.S Active',
      routeDeviation: 'Route Deviation',
      lockOpen: 'Lock Open',
      lockClose: 'Lock Closed',
      routeReturn: 'Route Return'
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
    },
    solveAlarm: {
      title: 'Solve Security Alert',
      mapTitle: 'Alarm Location: {type}',
      back: 'Back',
      openInMaps: 'Open in Maps',
      loadingMap: 'Loading map...',
      viewMap: 'View map',
      comment: 'Comment',
      commentPlaceholder: 'Enter the reason or comment for resolving this alarm...',
      commentRequired: 'Comment is required to solve the alarm.',
      commentRequiredToast: 'Please enter a comment or justification.',
      commentRequiredSummary: 'Comment required',
      visibility: 'Visibility:',
      visible: 'Visible',
      hidden: 'Not Visible',
      solveBtn: 'Solve Alarm',
      solvingBtn: 'Solving...',
      successToast: 'Alarm solved successfully',
      errorToast: 'Could not solve the alarm',
      networkErrorToast: 'Connection error while solving the alert',
      hardwareLabel: 'Hardware:'
    }
  }
}
