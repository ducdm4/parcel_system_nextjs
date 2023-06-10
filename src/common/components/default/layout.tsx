import Header from './header';
import React, {
  PropsWithChildren,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  userLoggedIn,
  verifyUserLogin,
} from '../../../features/auth/authSlice';
import { useRouter } from 'next/router';

export default function Layout({ children }: PropsWithChildren) {
  const userInfo = useAppSelector(userLoggedIn);
  const dispatch = useAppDispatch();
  const [isShowHeader, setIsShowHeader] = useState(true);

  const router = useRouter();

  if (typeof window !== 'undefined') {
    useLayoutEffect(() => {
      const verifyUser = async () => {
        const token = localStorage.getItem(
          process.env.NEXT_PUBLIC_API_KEY || 'DSAccessToken',
        );
        if (token && !userInfo.id) {
          try {
            await dispatch(verifyUserLogin()).unwrap();
          } catch (e) {}
        }
      };
      if (isShowHeader) {
        verifyUser();
      }
    }, []);
  }

  useEffect(() => {
    checkShowHeader();
  }, [router.pathname]);

  const checkShowHeader = () => {
    setIsShowHeader(router.pathname.split('/').indexOf('login') === -1);
  };

  return (
    <>
      <main>
        {isShowHeader && <Header />}
        <div className={'flex'}>
          <div
            className={
              (isShowHeader ? 'lg:w-[calc(98%)] mt-20' : 'lg:w-[calc(100vw)]') +
              ' relative min-h-[calc(100vh-74px)] m-auto'
            }
          >
            {children}
          </div>
        </div>
      </main>
    </>
  );
}
