"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/Button";
import TextInput from "@/components/TextInput";

type UsernameState = "neutral" | "success" | "fail";

export default function Register() {
  const [usernameState, _setUsernameState] = useState<UsernameState>("neutral");

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
              <TextInput inputState={usernameState} placeholder="Username" />
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
            <TextInput inputState="neutral" placeholder="Email Address" />
          </div>

          <div className="flex flex-col gap-3 space-y-4">
            <TextInput inputState="neutral" placeholder="Password" />
            <TextInput inputState="neutral" placeholder="Confirm Password" />
          </div>
          <div className=" flex flex-col items-center">
            <Button className="text-center">Register</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
