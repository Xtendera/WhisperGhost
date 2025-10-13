"use client";

import { LuCheck } from "react-icons/lu";
import { MdCancel } from "react-icons/md";
import { trpc } from "@/utils/trpc";

export default function Home() {
  const ping = trpc.health.ping.useQuery();
  const dbPing = trpc.health.db.useQuery();
  return (
    <div className="max-h-screen h-screen flex justify-center items-center">
      <div>
        <h1>System Check</h1>
        <ul>
          <li className="flex space-x-1">
            {ping.data === "pong" ? <LuCheck /> : <MdCancel />}
            <span>TRPC Check</span>
          </li>
          <li className="flex space-x-1">
            {dbPing.data ? <LuCheck /> : <MdCancel />}
            <span>Database Check</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
