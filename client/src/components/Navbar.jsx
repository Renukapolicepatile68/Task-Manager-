import React, { useEffect, useState } from "react";
import { HiMoon, HiSun } from "react-icons/hi";
import { MdOutlineSearch } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { setOpenSidebar } from "../redux/slices/authSlice";
import NotificationPanel from "./NotificationPanel";
import UserAvatar from "./UserAvatar";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { updateURL } from "../utils";

const Navbar = ({ theme, onToggleTheme }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  useEffect(() => {
    updateURL({ searchTerm, navigate, location });
  }, [searchTerm, navigate, location]);

  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [location.pathname, searchParams]);

  const handleSubmit = (e) => e.preventDefault();

  return (
    <div className='flex justify-between items-center bg-white dark:bg-[#1f1f1f] px-4 py-3 2xl:py-4 sticky z-10 top-0'>
      <div className='flex gap-4'>
        <div className=''>
          <button
            onClick={() => dispatch(setOpenSidebar(true))}
            className='text-2xl text-gray-500 block md:hidden'
          >
            ☰
          </button>
        </div>

        {location?.pathname !== "/dashboard" && (
          <form
            onSubmit={handleSubmit}
            className='w-64 2xl:w-[400px] flex items-center py-2 px-3 gap-2 rounded-full bg-[#f3f4f6] dark:bg-[#1c1c1c]'
          >
            <MdOutlineSearch className='text-gray-500 text-xl' />

            <input
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm}
              type='text'
              placeholder='Search...'
              className='flex-1 outline-none bg-transparent placeholder:text-gray-500 text-gray-800'
            />
          </form>
        )}
      </div>

      <div className='flex gap-2 items-center'>
        <button
          type='button'
          onClick={onToggleTheme}
          className='rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 transition'
          aria-label='Toggle theme'
        >
          {theme === "dark" ? <HiSun size={20} /> : <HiMoon size={20} />}
        </button>

        <NotificationPanel />

        <UserAvatar />
      </div>
    </div>
  );
};

export default Navbar;
