import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight,oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import { motion } from "framer-motion";
import CopyButtonCode from "./CopyButtonCode";


export default function BotMDComponent({ message }) {



    const content = typeof message === "string" ? message : JSON.stringify(message, null, 2);

    return (

        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ node, inline, className, children, ...props }) {
                
                 
                    
                    const match = /language-(\w+)/.exec(className || "");
                    const codeContent = String(children).replace(/\n$/, "");

                    if (!inline && match) {
                        
                        return (
                            <div  className="relative mb-4">
                                <CopyButtonCode message={codeContent} />
                                <SyntaxHighlighter
                                    style={oneDark}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{}}
                                    
                                    {...props}
                                >
                                    {codeContent}
                                </SyntaxHighlighter>
                            </div>
                        );
                    }

                    return (
                        <code
                            className="bg-gray-0 text-wrap  text-xs"
                            {...props}
                        >
                            {children}
                        </code>
                    );
                },
                hr({children}){
                    return (
                        <hr className="my-2">{children}</hr>
                    )
                },
                ol({children}){
                    return (
                        <ol className="mx-2">{children}</ol>
                    )
                },

                pre({ children }) {
                    return (
                        <pre className="my-3">
                            {children}
                        </pre>
                    )
                },
                a({ children }) {
                    return (
                        <a className="underline text-blue-500 font-medium text-xs cursor-pointer">
                            {children}
                        </a>
                    )
                },
                table({ children }) {
                    return (
                        <motion.div
                            style={{ overflowX: "auto", margin: "10px 0" }}
                            className="border border-gray-300 rounded-lg overflow-hidden shadow-sm mb-3 overflow-x-auto bg-white">
                            <table
                                className="min-w-full divide-y divide-gray-200"
                            >
                                {children}
                            </table>
                        </motion.div>
                    );
                },
                tr({ children }) {
                    return (
                        <tr className="hover:bg-gray-100">{children}</tr>
                    )
                },
                thead({ children }) {
                    return (
                        <thead className="bg-gray-50">
                            {children}
                        </thead>
                    )
                },
                th({ children }) {
                    return (
                        <th
                            style={{ overflowWrap: 'anywhere' }}
                            className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300 bg-gray-50/80 whitespace-normal break-words"
                        >
                            {children}
                        </th>
                    );
                },
                td({ children }) {
                    return (
                        <td
                            className="px-4 py-3 text-sm text-gray-700 whitespace-normal border-b border-gray-200 break-words"
                            style={{ overflowWrap: 'anywhere' }}
                        >
                            {children}
                        </td>
                    );
                },
                ul({ children }) {
                    return (
                        <ul
                            className="list-disc ml-5 my-3"
                        >
                            {children}
                        </ul>
                    )
                },
                li({ children }) {
                    return (
                        <li className="my-1">
                            {children}
                        </li>
                    )
                },
                p({children}) {
                    return (
                        <p className="my-1">{children}</p>
                    )
                },
                em({children}) {
                    return (
                        <em className="text-xs"> {children}</em>
                    )
                }
            }}
        >
            {content}
        </ReactMarkdown>

    );
}