import type { InferGetStaticPropsType, GetStaticPropsContext } from "next";
import {
  Typography,
  Grid,
  Paper,
  Box,
  ChipPropsColorOverrides,
} from "@mui/material";
import { GetStaticPaths } from "next";
import { supabase } from "@/lib/supabase";
import SpeedDialTooltipOpen from "@/components/SpeedDial";
import Head from "next/head";
import { Course } from "@/models/course";
import { Review } from "@/models/review";
import { OverridableStringUnion } from "@mui/types";
import ReviewCard from "@/components/ReviewCard";
import { Session } from "@supabase/supabase-js";
import { isCurrentUserReview } from "@/lib/userUtils";
import { useRouter } from "next/router";

type CourseReviewSummary = {
  id: number;
  course_name: string;
  course_code: string;
  totalReviews: number;
  averageDifficulty: number;
  averageWorkload: number;
  averageRating: number;
  [key: string]: number | string;
};

//  type defs for chip colors
type ChipColor = OverridableStringUnion<
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning",
  ChipPropsColorOverrides
>;

export const getStaticPaths: GetStaticPaths = async () => {
  const { data: courses, error } = await supabase
    .from("Courses")
    .select("course_code");
  if (error) throw error;
  const paths = courses.map((course: { course_code: string }) => ({
    params: { course_code: course.course_code },
  }));
  return { paths, fallback: false };
};

export const getStaticProps = async (
  context: GetStaticPropsContext<{ course_code: string }>,
) => {
  const { course_code } = context.params as { course_code: string };
  let apiUrl =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_API_URL
      : "http://localhost:3000";

  // fetch course data
  const resCourse = await fetch(
    `${apiUrl}/api/courses?course_code=${course_code}`,
  );
  const courses: Course[] = await resCourse.json();

  // ensure course is found
  const course = courses.length > 0 ? courses[0] : null;
  if (!course) {
    return { notFound: true };
  }

  // fetch course summary
  const resSummary = await fetch(
    `${apiUrl}/api/course-summaries?course_code=${course_code}`,
  );
  const courseSummary: CourseReviewSummary[] = await resSummary.json();

  // fetch course reviews
  const resReviews = await fetch(
    `${apiUrl}/api/reviews?course_id=${course.id}`,
  );
  let reviews: Review[] = await resReviews.json();

  // sort the reviews by semester and 'created_at'
  reviews = reviews.sort((a, b) => {
    const termMap: { [key in "Spring" | "Summer" | "Fall"]: string } = {
      Spring: "10",
      Summer: "20",
      Fall: "30",
    };

    const parseSemester = (semester: string) => {
      const [term, year] = semester.split(" ");
      // check if term is a valid key in termMap, if not return 0
      return term in termMap
        ? parseInt(year + termMap[term as "Spring" | "Summer" | "Fall"])
        : 0;
    };

    const semesterDiff = parseSemester(b.semester) - parseSemester(a.semester);

    if (semesterDiff !== 0) return semesterDiff;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    props: {
      course,
      courseSummary,
      reviews,
    },
    revalidate: 86400,
  };
};

// color mappings
const difficultyColors: { [key: string]: ChipColor } = {
  "Very Easy": "success",
  Easy: "primary",
  Medium: "default",
  Hard: "warning",
  "Very Hard": "error",
};

const ratingColors: { [key: string]: ChipColor } = {
  "Strongly Disliked": "error",
  Disliked: "warning",
  Neutral: "default",
  Liked: "primary",
  "Strongly Liked": "success",
};

// function to get color based on value
const getDifficultyColor = (value: string) =>
  difficultyColors[value as keyof typeof difficultyColors];
const getRatingColor = (value: string) =>
  ratingColors[value as keyof typeof ratingColors];

// format date for each review's created_at db date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};

export default function CourseReviews({
  course,
  courseSummary,
  reviews,
  currentUser,
}: InferGetStaticPropsType<typeof getStaticProps> & {
  currentUser: Session | null;
}) {
  const router = useRouter();
  if (!reviews.length) {
    return (
      <Typography variant="h6" align="center" mt={5}>
        No reviews are available for this course.
      </Typography>
    );
  }

  const summary = courseSummary[0];

  const sections = [
    { label: "Total Reviews", key: "totalReviews" },
    { label: "Average Difficulty", key: "averageDifficulty" },
    { label: "Average Workload", key: "averageWorkload" },
    { label: "Average Rating", key: "averageRating" },
  ];

  return (
    <>
      <Head>
        <title>{`${course.course_code}: ${course.course_name}`}</title>
      </Head>

      <Typography variant="h4" align="center" gutterBottom mt={3} mb={3}>
        Reviews for {course.course_code}: {course.course_name}
      </Typography>

      <Paper sx={{ maxWidth: 800, margin: "30px auto", padding: 2 }}>
        <Grid container spacing={2}>
          {sections.map(({ label, key }) => (
            <Grid item key={key} xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="subtitle1" color="textSecondary">
                  {label}
                </Typography>
                <Typography variant="h6">
                  {typeof summary[key] === "number"
                    ? (summary[key] as number) % 1 === 0
                      ? summary[key]
                      : (summary[key] as number).toFixed(2)
                    : summary[key]}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {reviews.map((review, index) => (
        <ReviewCard
          review={review}
          key={review.id}
          course={course}
          onEdit={() => router.push(`/reviews/edit-review?id=${review.id}`)}
          showEditDeleteOptions={isCurrentUserReview(review)} // only display edit and delete options if the current user wrote the review
        />
      ))}

      <SpeedDialTooltipOpen />
    </>
  );
}
