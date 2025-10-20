"use client";

import { client } from "@serenity-kit/opaque";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import PasswordInput from "@/components/PasswordInput";
import TextInput from "@/components/TextInput";
import { checkPassword } from "@/utils/authUtils";
import { trpc } from "@/utils/trpc";

type ValidationState = "neutral" | "success" | "fail";

export default function Login() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameState, setUsernameState] =
    useState<ValidationState>("neutral");
  const [passwordState, setPasswordState] =
    useState<ValidationState>("neutral");

  const loginState = useRef("");

  useEffect(() => {
    if (username.length === 0) {
      setUsernameState("neutral");
    } else if (username.length >= 2) {
      setUsernameState("success");
    } else {
      setUsernameState("fail");
    }
  }, [username]);

  useEffect(() => {
    if (password.length === 0) {
      setPasswordState("neutral");
    } else if (!checkPassword(password)) {
      setPasswordState("fail");
    } else {
      setPasswordState("success");
    }
  }, [password]);

  function onUsernameChange(input: string) {
    setUsername(input);
  }

  function onPasswordChange(input: string) {
    setPassword(input);
  }

  const finalLogin = trpc.auth.finalLogin.useMutation({
    onSuccess: (data) => {
      if (data.error) {
        console.error("Login failed: ", data.error);
        return;
      }
      router.push("/app");
    },
    onError: (error) => {
      console.error("Login failed: ", error);
    },
  });

  const initialLogin = trpc.auth.initialLogin.useMutation({
    onSuccess: (data) => {
      if (!data.loginResponse || !data.loginToken || data.error) {
        console.error("Login failed: ", data.error);
        return;
      }
      const finishResult = client.finishLogin({
        clientLoginState: loginState.current,
        loginResponse: data.loginResponse,
        password,
      });
      if (!finishResult) {
        console.error("Login failed: Unable to finish login");
        return;
      }
      finalLogin.mutate({
        finishLoginRequest: finishResult.finishLoginRequest,
        loginToken: data.loginToken,
      });
    },
    onError: (error) => {
      console.error("Login failed: ", error);
    },
  });

  function onLogin() {
    const { clientLoginState, startLoginRequest } = client.startLogin({
      password,
    });

    if (!clientLoginState) {
      return;
    }
    loginState.current = clientLoginState;

    initialLogin.mutate({
      username,
      loginRequest: startLoginRequest,
    });
  }

  return (
    <div className="max-h-screen h-screen flex justify-center items-center p-4">
      <div className="p-4 border border-purple-500/30 backdrop-blur-2xl bg-linear-to-bl from-wg-purple/70 to-wg-dark-gray/20 rounded-xl h-auto w-full max-w-md shadow-lg shadow-purple-500/20">
        <div className="flex justify-center flex-col items-center">
          <h1 className="text-3xl font-roboto-flex font-bold mt-4">Login</h1>
          <span className="">
            Need an account? Click
            <Link href="/register" className="font-semibold underline ml-1">
              here
            </Link>
            .
          </span>
        </div>
        <form
          action=""
          onSubmit={(e) => e.preventDefault()}
          className="mt-4 flex flex-col gap-3 space-y-8"
        >
          <div className="flex flex-col gap-3 space-y-4">
            <div className="flex flex-col">
              <TextInput
                onChange={(c) => onUsernameChange(c.currentTarget.value)}
                value={username}
                inputState={usernameState}
                placeholder="Username"
              />
              {usernameState === "success" && (
                <span className="mt-1 text-sm text-green-500">
                  Username looks good
                </span>
              )}
              {usernameState === "fail" && (
                <span className="mt-1 text-sm text-red-500">
                  Username must be at least 2 characters
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <PasswordInput
                onChange={(c) => onPasswordChange(c.currentTarget.value)}
                value={password}
                inputState={passwordState}
                placeholder="Password"
              />
              {passwordState === "success" && (
                <span className="mt-1 text-sm text-green-500">
                  Ready to sign in
                </span>
              )}
              {passwordState === "fail" && (
                <span className="mt-1 text-sm text-red-500">
                  Password must meet requirements
                </span>
              )}
            </div>
          </div>
          <div className=" flex flex-col items-center">
            <Button
              className="text-center"
              onClick={onLogin}
              disabled={
                usernameState !== "success" || passwordState !== "success"
              }
            >
              Login
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
