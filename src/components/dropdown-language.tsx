"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
	trigger: ReactNode;
	defaultOpen?: boolean;
	align?: "start" | "center" | "end";
};

const languages = [
	{ code: "en", name: "English", flag: "🇺🇸" },
	{ code: "es", name: "Español", flag: "🇪🇸" },
	{ code: "fr", name: "Français", flag: "🇫🇷" },
	{ code: "de", name: "Deutsch", flag: "🇩🇪" },
	{ code: "pt", name: "Português", flag: "🇵🇹" },
	{ code: "si", name: "සිංහල", flag: "🇱🇰" },
	{ code: "ta", name: "தமிழ்", flag: "🇮🇳" },
	{ code: "hi", name: "हिंदी", flag: "🇮🇳" },
];

const LanguageDropdown = ({ defaultOpen, align, trigger }: Props) => {
	const { i18n, t } = useTranslation();

	const changeLanguage = (languageCode: string) => {
		i18n.changeLanguage(languageCode);
	};

	return (
		<DropdownMenu defaultOpen={defaultOpen}>
			<DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
			<DropdownMenuContent className="w-50" align={align || "end"}>
				<DropdownMenuRadioGroup
					value={i18n.language}
					onValueChange={changeLanguage}
				>
					{languages.map((language) => (
						<DropdownMenuRadioItem
							key={language.code}
							value={language.code}
							className="data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground pl-2 text-base [&>span]:hidden"
						>
							<span className="mr-2">{language.flag}</span>
							{language.name}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default LanguageDropdown;
