// import axios from 'axios';

// const api = axios.create({
//   baseURL: '/api',
// });

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token');
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// api.interceptors.response.use(
//   (res) => res,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('token');
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;



import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true
});

api.interceptors.request.use((config) => {

  const token =
    localStorage.getItem('token');

  if (token) {

    config.headers.Authorization =
      `Bearer ${token}`;

  }

  return config;

});

api.interceptors.response.use(

  (res) => res,

  (error) => {

    if (error.response?.status === 401) {

      localStorage.removeItem('token');

      window.location.href = '/login';

    }

    return Promise.reject(error);

  }

);

export default api;