import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import { storage } from "@/lib/storage";
import type { AdminUser } from "@/features/auth/authTypes";

type AuthState = {
  user: AdminUser | null;
  token: string | null;
  status: "idle" | "loading" | "failed";
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  token: storage.getToken(),
  status: "idle",
  error: null,
};

export const adminLogin = createAsyncThunk(
  "auth/login",
  async (payload: { email: string; password: string }) => {
    const res = await api.post("/admin/auth/login", payload);
    return res.data as { token: string; user: AdminUser };
  },
);

export const fetchAdminMe = createAsyncThunk("auth/me", async () => {
  const res = await api.get("/admin/auth/me");
  return res.data as { user: AdminUser };
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      storage.clearToken();
    },
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
      if (action.payload) storage.setToken(action.payload);
      else storage.clearToken();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(adminLogin.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload.user;
        state.token = action.payload.token;
        storage.setToken(action.payload.token);
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          (action.error.message as string) || "Login failed. Try again.";
      })
      .addCase(fetchAdminMe.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAdminMe.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload.user;
      })
      .addCase(fetchAdminMe.rejected, (state) => {
        state.status = "failed";
        // token may be invalid/expired
      });
  },
});

export const { logout, setToken } = authSlice.actions;
export default authSlice.reducer;

