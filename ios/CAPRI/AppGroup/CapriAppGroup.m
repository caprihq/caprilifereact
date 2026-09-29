#import <React/RCTBridgeModule.h>

/**
 * React Native registration for CapriAppGroup.
 *
 * The implementation is Swift (CapriAppGroup.swift). It cannot declare itself to
 * React Native, because doing so needs the React headers and this target has no
 * bridging header — so the declaration lives here, in Objective-C, where those
 * headers are available. `RCT_EXTERN_MODULE` resolves the Swift class by name at
 * runtime, so neither file has to import the other.
 */
@interface RCT_EXTERN_MODULE (CapriAppGroup, NSObject)

RCT_EXTERN_METHOD(setItem:(NSString *)key
                  value:(NSString *)value
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeItem:(NSString *)key
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reloadAll:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
