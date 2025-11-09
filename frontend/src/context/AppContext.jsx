import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const currencySymbol = "₹";
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [doctors, setDoctors] = useState([]);
  const [token, setToken] = useState(
    localStorage.getItem("token") && localStorage.getItem("token") !== "undefined"
      ? localStorage.getItem("token")
      : ""
  );
  const [userData, setUserData] = useState(false);

  // ✅ Get doctors list
  const getDoctosData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/list");
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to load doctors");
    }
  };

  // ✅ Load user profile if token is valid
  const loadUserProfileData = async () => {
    if (!token || token === "undefined" || token === "null") return;

    try {
      const { data } = await axios.get(backendUrl + "/api/user/get-profile", {
        headers: { token },
      });

      if (data.success) {
        setUserData(data.userData);
      } else {
        // invalid or expired token
        toast.error("Session expired, please login again");
        localStorage.removeItem("token");
        setToken("");
      }
    } catch (error) {
      console.warn("Token verification failed:", error.message);
      localStorage.removeItem("token");
      setToken("");
    }
  };

  useEffect(() => {
    getDoctosData();
  }, []);

  useEffect(() => {
    if (token && token !== "undefined" && token !== "null") {
      loadUserProfileData();
    }
  }, [token]);

  const value = {
    doctors,
    getDoctosData,
    currencySymbol,
    backendUrl,
    token,
    setToken,
    userData,
    setUserData,
    loadUserProfileData,
  };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;