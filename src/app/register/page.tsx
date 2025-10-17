"use client";

import { client } from "@serenity-kit/opaque";
import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import PasswordInput from "@/components/PasswordInput";
import TextInput from "@/components/TextInput";
import { checkPassword } from "@/utils/authUtils";
import { trpc } from "@/utils/trpc";

type ValidationState = "neutral" | "success" | "fail";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [usernameState, setUsernameState] =
    useState<ValidationState>("neutral");
  const [emailState, setEmailState] = useState<ValidationState>("neutral");
  const [passwordState, setPasswordState] =
    useState<ValidationState>("neutral");
  const [confirmState, setConfirmState] = useState<ValidationState>("neutral");

  const { data: isUsernameAvailable, error: usernameError } =
    trpc.auth.validateUsername.useQuery(username, {
      enabled: username.length >= 2,
    });

  useEffect(() => {
    if (username.length < 2) {
      setUsernameState("neutral");
    } else if (usernameError) {
      setUsernameState("fail");
    } else if (isUsernameAvailable !== undefined) {
      setUsernameState(isUsernameAvailable ? "success" : "fail");
    }
  }, [username, isUsernameAvailable, usernameError]);

  useEffect(() => {
    if (email.length === 0) {
      setEmailState("neutral");
    } else if (
      // This regex was taken from the Zod documentation.
      !/^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i.test(
        email,
      )
    ) {
      setEmailState("fail");
    } else {
      setEmailState("success");
    }
  }, [email]);

  useEffect(() => {
    if (password.length === 0) {
      setPasswordState("neutral");
    } else if (!checkPassword(password)) {
      setPasswordState("fail");
    } else {
      setPasswordState("success");
    }
  }, [password]);

  useEffect(() => {
    if (confirm.length === 0) {
      setConfirmState("neutral");
    } else if (confirm === password) {
      setConfirmState("success");
    } else {
      setConfirmState("fail");
    }
  }, [confirm, password]);

  function onUsernameChange(input: string) {
    setUsername(input);
  }

  function onEmailChange(input: string) {
    setEmail(input);
  }

  function onPasswordChange(input: string) {
    setPassword(input);
  }

  function onConfirmChange(input: string) {
    setConfirm(input);
  }

  function onRegister() {
    // Start OPAQUE registration
    const { clientRegistrationState, registrationRequest } =
      client.startRegistration({ password });

    
  }

  return (
    <div className="max-h-screen h-screen flex justify-center items-center p-4">
      <div className="p-4 border border-purple-500/30 backdrop-blur-2xl bg-linear-to-bl from-wg-purple/70 to-wg-dark-gray/20 rounded-xl h-auto w-full max-w-md shadow-lg shadow-purple-500/20">
        <div className="flex justify-center flex-col items-center">
          <h1 className="text-3xl font-roboto-flex font-bold mt-4">Register</h1>
          <span className="">
            Already have an account? Click
            <Link href="/login" className="font-semibold underline ml-1">
              here
            </Link>
            .
          </span>
        </div>
        <form action="" className="mt-4 flex flex-col gap-3 space-y-8">
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
                  Username is available
                </span>
              )}
              {usernameState === "fail" && (
                <span className="mt-1 text-sm text-red-500">
                  Username is not available
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <TextInput
                onChange={(c) => onEmailChange(c.currentTarget.value)}
                value={email}
                inputState={emailState}
                placeholder="Email Address"
              />
              {emailState === "success" && (
                <span className="mt-1 text-sm text-green-500">
                  Valid email address
                </span>
              )}
              {emailState === "fail" && (
                <span className="mt-1 text-sm text-red-500">
                  Invalid email address
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 space-y-4">
            <div className="flex flex-col">
              <PasswordInput
                onChange={(c) => onPasswordChange(c.currentTarget.value)}
                value={password}
                inputState={passwordState}
                placeholder="Password"
              />
              {passwordState === "success" && (
                <span className="mt-1 text-sm text-green-500">
                  Valid password
                </span>
              )}
              {passwordState === "fail" && (
                <span className="mt-1 text-sm text-red-500">
                  Password must meet requirements
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <PasswordInput
                onChange={(c) => onConfirmChange(c.currentTarget.value)}
                value={confirm}
                inputState={confirmState}
                placeholder="Confirm Password"
              />
              {confirmState === "success" && (
                <span className="mt-1 text-sm text-green-500">
                  Passwords match
                </span>
              )}
              {confirmState === "fail" && (
                <span className="mt-1 text-sm text-red-500">
                  Passwords do not match
                </span>
              )}
            </div>
          </div>
          <div className=" flex flex-col items-center">
            <Button
              className="text-center"
              onClick={onRegister}
              disabled={
                usernameState !== "success" ||
                passwordState !== "success" ||
                confirmState !== "success"
              }
            >
              Register
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
