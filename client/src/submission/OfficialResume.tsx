import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import type { PortfolioContent, EducationEntry } from "@/content/types";

import {
  cleanFormText,
  shortIntroduction,
  type OfficialDetails,
} from "./officialForm";
// Coordinates refer to the first A4 page exported from the ministry's original HWP.
// This transparent page is overlaid on that actual PDF, not a redrawn approximation.
export function OfficialResume({
  content,
  careers,
  introduction,
  details = {},
}: {
  content: PortfolioContent;
  careers: EducationEntry[];
  introduction: string;
  details?: OfficialDetails;
}) {
  const cell = (
    value: string | undefined,
    x: number,
    y: number,
    width: number,
    size = 9,
    height = 24
  ) => (
    <View style={{ position: "absolute", left: x, top: y, width, height }}>
      <Text
        style={{ fontFamily: "Submission", fontSize: size, lineHeight: 1.2 }}
      >
        {cleanFormText(value ?? "")}
      </Text>
    </View>
  );
  const employment = careers.filter(e => e.type === "work").slice(0, 2);
  return (
    <Page
      size={[595, 841]}
      style={{ width: 595, height: 841, minHeight: 841 }}
      wrap={false}
    >
      {cell(content.profile.name, 231, 153, 295)}
      {cell(content.profile.romanizedName, 231, 177, 295)}
      {cell(details.address, 147, 198, 380, 8.5, 27)}
      {cell(details.telephone, 243, 240, 126, 8.5, 12)}
      {cell(details.mobile, 381, 240, 145, 8.5, 12)}
      {cell(
        content.profile.contacts.find(c => c.type === "email")?.label,
        243,
        260,
        283
      )}
      {employment.map((e, i) => (
        <React.Fragment key={i}>
          {cell(e.school, 150, 305 + i * 24, 84, 7.5, 21)}
          {cell(e.degree, 243, 305 + i * 24, 128, 8, 21)}
          {cell(e.period.replace(/—/g, "-"), 380, 309 + i * 24, 147, 8, 13)}
        </React.Fragment>
      ))}
      {cell(details.qualification1, 243, 357, 128, 8, 12)}
      {cell(details.qualificationDate1, 380, 357, 147, 8, 12)}
      {cell(details.qualification2, 243, 369, 128, 8, 12)}
      {cell(details.qualificationDate2, 380, 369, 147, 8, 12)}
      {cell(details.specialty, 243, 382, 283, 8, 18)}
      {cell(shortIntroduction(introduction), 151, 459, 375, 9, 69)}
      {cell(details.veteranNumber, 216, 555, 310, 9, 30)}
      {cell(details.disabilityType, 138, 639, 69, 8, 16)}
      {cell(details.disabilityDegree, 214, 639, 99, 8, 16)}
      {cell(details.disabilityNumber, 319, 639, 207, 8, 16)}
      {cell(details.basicLivelihood, 215, 700, 147, 8, 14)}
      {cell(details.singleParent, 370, 700, 156, 8, 14)}
    </Page>
  );
}
