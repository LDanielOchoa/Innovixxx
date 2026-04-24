import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CookieAuth } from '../utils/cookie-auth'
import { useRouter } from 'vue-router'
import { useGroupStore } from './group.store'
import { obtenerUrlImagen } from '../utils/imagenes'

interface UserData {
  nombre: string
  email: string
  grupo: string
  idioma: string
  tz: string
  foto: string
}

export const useAuthStore = defineStore('auth', () => {
  const userData = ref<UserData>({
    nombre: '',
    email: '',
    grupo: '',
    idioma: '',
    tz: '',
    foto: ''
  })
  
  const isAdmin = ref(false)
  const isLoading = ref(true)

  const userAvatar = computed(() => obtenerUrlImagen(userData.value.foto))

  const limpiarCookiesExceptoIdioma = () => {
    const cookies = document.cookie.split(';')
    cookies.forEach((cookie) => {
      const nombre = cookie.split('=')[0]?.trim()
      if (nombre && nombre !== 'app-locale') {
        document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })
  }

  const logout = (routerInstance: ReturnType<typeof useRouter>) => {
    limpiarCookiesExceptoIdioma()
    CookieAuth.removeToken()
    localStorage.removeItem('auth-grupo')
    localStorage.removeItem('auth-grupo-obj')
    userData.value = { nombre: '', email: '', grupo: '', idioma: '', tz: '', foto: '' }
    isAdmin.value = false
    routerInstance.push('/login')
  }

  const fetchUserProfile = async (
    routerInstance: ReturnType<typeof useRouter>,
    setLocaleCallback?: (lang: string) => void
  ) => {
    isLoading.value = true
    const token = CookieAuth.getToken()
    
    if (!token) {
      logout(routerInstance)
      return
    }

    try {
      const response = await fetch('/api/v1/get_meta/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Token inválido o expirado')
      }

      const data = await response.json()
      
      if (data.done && data.data) {
        userData.value.nombre = data.data.nombre
        userData.value.email = data.data.email || ''
        userData.value.grupo = data.data.grupo
        userData.value.idioma = data.data.idioma
        userData.value.tz = data.data.tz
        userData.value.foto = data.data.foto || ''

        const groupStore = useGroupStore()
        if (data.data.grupo) {
          const idGrupoCrudo = typeof data.data.id_grupo === 'string' ? data.data.id_grupo.trim() : ''
          const idGrupoValido = idGrupoCrudo.length === 8 ? idGrupoCrudo : ''
          groupStore.setGroup({ id: idGrupoValido, nombre: data.data.grupo })
        }

        if (data.data.idioma) {
          if (setLocaleCallback) setLocaleCallback(data.data.idioma)
          localStorage.setItem('app-locale', data.data.idioma)
        }
        
        // Verificamos permisos de admin probando el endpoint de listar grupos sin body
        try {
          const adminRes = await fetch('/api/v1/grupo/listar/', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          });
          
          if (!adminRes.ok) {
             isAdmin.value = false;
          } else {
             const adminData = await adminRes.json();
             if (adminData.done === false && adminData.message === 'Operación no permitida') {
               isAdmin.value = false;
             } else {
               isAdmin.value = true;
             }
          }
        } catch (err) {
          console.error('Error verificando admin status', err);
          isAdmin.value = false;
        }
        
      } else {
        throw new Error('Datos no válidos')
      }
    } catch (error) {
      console.error('Error al obtener metadatos:', error)
      logout(routerInstance)
    } finally {
      isLoading.value = false
    }
  }

  return {
    userData,
    isAdmin,
    isLoading,
    userAvatar,
    fetchUserProfile,
    logout
  }
})
