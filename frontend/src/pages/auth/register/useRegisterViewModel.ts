import { useCallback, useState } from "react";
import { parseHandicapInput } from "@/domain/handicap";
import { useCourseSearch } from "@/data/useCourseSearch";
import { messageFrom } from "@/lib/userFacingErrors";
import type { CourseSearchRepository } from "@/pages/rounds/roundsRepository";
import { coursesRepository } from "@/pages/courses/coursesRepository";
import type { CourseSummary } from "@/domain/course";
import type { AuthActions } from "../authActions";
import { hasErrors, newPasswordErrors } from "../authModel";
import { useRegister } from "../useRegister";

export interface RegisterErrors {
  password: string | null;
  confirm: string | null;
  handicap: string | null;
}

const NO_ERRORS: RegisterErrors = { password: null, confirm: null, handicap: null };

export interface HomeCourse {
  id: string;
  name: string;
}

export interface RegisterViewModel {
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  confirm: string;
  setConfirm: (confirm: string) => void;
  handicap: string;
  setHandicap: (handicap: string) => void;

  courseQuery: string;
  setCourseQuery: (query: string) => void;
  courseResults: CourseSummary[];
  searchingCourses: boolean;
  homeCourse: HomeCourse | null;
  pickHomeCourse: (course: CourseSummary) => void;
  clearHomeCourse: () => void;

  fieldErrors: RegisterErrors;
  error: string | null;
  submitting: boolean;
  submit: (onRegistered: (email: string, message: string) => void) => void;
}

export function useRegisterViewModel(
  auth: Pick<AuthActions, "register">,
  courses: CourseSearchRepository = coursesRepository,
): RegisterViewModel {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [handicap, setHandicap] = useState("");
  const [homeCourse, setHomeCourse] = useState<HomeCourse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>(NO_ERRORS);
  const search = useCourseSearch(undefined, courses);
  const register = useRegister(auth);
  const { mutate: createAccount } = register;
  const { reset: resetSearch } = search;

  const clearError = (field: keyof RegisterErrors) =>
    setFieldErrors((errors) => (errors[field] ? { ...errors, [field]: null } : errors));

  const pickHomeCourse = useCallback(
    (course: CourseSummary) => {
      setHomeCourse({ id: course.id, name: course.name ?? "Unnamed course" });
      resetSearch();
    },
    [resetSearch],
  );

  const submit = useCallback(
    (onRegistered: (email: string, message: string) => void) => {
      const parsedHandicap = parseHandicapInput(handicap);
      const errors: RegisterErrors = {
        ...newPasswordErrors(password, confirm),
        handicap: parsedHandicap.error,
      };
      setFieldErrors(errors);
      if (hasErrors(errors)) return;

      const address = email.trim();
      createAccount(
        {
          name: name.trim(),
          email: address,
          password,
          handicap: parsedHandicap.value,
          homeCourseId: homeCourse?.id ?? null,
        },
        { onSuccess: (message) => onRegistered(address, message) },
      );
    },
    [name, email, password, confirm, handicap, homeCourse, createAccount],
  );

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword: (next) => {
      setPassword(next);
      clearError("password");
    },
    confirm,
    setConfirm: (next) => {
      setConfirm(next);
      clearError("confirm");
    },
    handicap,
    setHandicap: (next) => {
      setHandicap(next);
      clearError("handicap");
    },

    courseQuery: search.query,
    setCourseQuery: search.setQuery,
    courseResults: search.results,
    searchingCourses: search.searching,
    homeCourse,
    pickHomeCourse,
    clearHomeCourse: () => setHomeCourse(null),

    fieldErrors,
    error: register.error ? messageFrom(register.error, "Registration failed") : null,
    submitting: register.isPending,
    submit,
  };
}
