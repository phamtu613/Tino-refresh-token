class Http {
  constructor() {
    this.instance = axios.create({
      timeout: 10000,
      baseURL: "https://eto.tino.org/api/",
      withCredentials: false,
      headers: {
        Accept: "application/json",
        "Content-Type": "x-www-form-urlencoded",
      },
    });
    this.refreshTokenRequest = null;
    this.instance.interceptors.request.use(
      (config) => {
        const access_token = localStorage.getItem("access_token");
        if (access_token) {
          config.headers.Authorization = `Bearer ${access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    this.instance.interceptors.response.use(
      (config) => config.data,
      (error) => {
        if (
          error.response.status === 401 &&
          error.response.data.error.includes("invalid_token")
        ) {
          this.refreshTokenRequest = this.refreshTokenRequest
            ? this.refreshTokenRequest
            : refreshToken().finally(() => {
                this.refreshTokenRequest = null;
              });
          return this.refreshTokenRequest
            .then((access_token) => {
              error.response.config.Authorization = access_token;
              return this.instance(error.response.config);
            })
            .catch((refreshTokenerror) => {
              throw refreshTokenerror;
            });
        }
        return Promise.reject(error);
      }
    );
  }

  get(url) {
    return this.instance.get(url);
  }

  post(url, body) {
    return this.instance.post(url, body);
  }
}

const http = new Http();
const fetchContacts = () => {
  http
    .get("contacts")
    .then((res) => {
      console.log(res);
    })
    .catch((error) => {
      console.log(error);
    });
};

const refreshToken = async () => {
  const refresh_token = localStorage.getItem("refresh_token");
  try {
    const res = await http.post("token", {
      refresh_token,
    });
    const { access_token } = res.data;
    localStorage.setItem("access_token", access_token);
    return access_token;
  } catch (error) {
    localStorage.clear();
    throw error.response;
  }
};

document.getElementById("form-login").addEventListener("submit", (event) => {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  http
    .post("login", {
      username,
      password,
    })
    .then((res) => {
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
    })
    .catch((error) => {
      console.log(error);
    });
});

document
  .getElementById("btn-get-contacts")
  .addEventListener("click", (event) => {
    fetchContacts();
  });
